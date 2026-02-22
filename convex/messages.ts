import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getAuthUserId } from "./auth";

/**
 * Send a message to a conversation
 */
export const send = mutation({
  args: {
    conversationId: v.id("conversations"),
    content: v.string(),
  },
  handler: async (ctx, args) => {
    const currentUserId = await getAuthUserId(ctx);

    // Verify membership
    const membership = await ctx.db
      .query("conversationMembers")
      .withIndex("by_conversationId_userId", (q) =>
        q.eq("conversationId", args.conversationId).eq("userId", currentUserId)
      )
      .unique();

    if (!membership) {
      throw new Error("You are not part of this conversation");
    }

    // Insert message
    const messageId = await ctx.db.insert("messages", {
      conversationId: args.conversationId,
      senderId: currentUserId,
      content: args.content,
      createdAt: Date.now(),
    });

    // Update conversation last message and timestamp
    await ctx.db.patch(args.conversationId, {
      lastMessageId: messageId,
      updatedAt: Date.now(),
    });

    // Increment unread count for other members
    const allMembers = await ctx.db
      .query("conversationMembers")
      .withIndex("by_conversationId", (q) => q.eq("conversationId", args.conversationId))
      .collect();

    for (const member of allMembers) {
      if (member.userId !== currentUserId) {
        await ctx.db.patch(member._id, {
          unreadCount: member.unreadCount + 1,
        });
      }
    }

    // Also remove typing status if the user was typing
    const typingStatus = await ctx.db
      .query("typingStatus")
      .withIndex("by_conversationId_userId", (q) =>
        q.eq("conversationId", args.conversationId).eq("userId", currentUserId)
      )
      .unique();

    if (typingStatus && typingStatus.isTyping) {
      await ctx.db.patch(typingStatus._id, { isTyping: false, updatedAt: Date.now() });
    }

    return messageId;
  },
});

/**
 * List messages in a conversation
 */
export const list = query({
  args: {
    conversationId: v.id("conversations"),
  },
  handler: async (ctx, args) => {
    try {
      const currentUserId = await getAuthUserId(ctx);

      // Verify membership to read messages
      const membership = await ctx.db
        .query("conversationMembers")
        .withIndex("by_conversationId_userId", (q) =>
          q.eq("conversationId", args.conversationId).eq("userId", currentUserId)
        )
        .unique();

      if (!membership) {
        throw new Error("You are not part of this conversation");
      }

      const messages = await ctx.db
        .query("messages")
        .withIndex("by_conversationId", (q) => q.eq("conversationId", args.conversationId))
        .collect();

      const messagesWithSender = await Promise.all(
        messages.map(async (msg) => {
          const sender = await ctx.db.get(msg.senderId);
          return {
            ...msg,
            senderImageUrl: sender?.imageUrl,
            senderName: sender?.name,
          };
        })
      );

      return messagesWithSender;
    } catch {
      return []; // Return empty if error or unauthenticated
    }
  },
});

/**
 * Delete a message (Soft delete)
 */
export const deleteMsg = mutation({
  args: {
    messageId: v.id("messages"),
  },
  handler: async (ctx, args) => {
    const currentUserId = await getAuthUserId(ctx);
    const message = await ctx.db.get(args.messageId);

    if (!message) {
      throw new Error("Message not found");
    }

    if (message.senderId !== currentUserId) {
      throw new Error("Cannot delete someone else's message");
    }

    await ctx.db.patch(args.messageId, {
      isDeleted: true,
      content: "This message was deleted",
    });
  },
});

/**
 * Toggle a reaction on a message
 */
export const toggleReaction = mutation({
  args: {
    messageId: v.id("messages"),
    emoji: v.string(),
  },
  handler: async (ctx, args) => {
    const currentUserId = await getAuthUserId(ctx);
    const message = await ctx.db.get(args.messageId);

    if (!message) {
      throw new Error("Message not found");
    }

    // Check membership
    const membership = await ctx.db
      .query("conversationMembers")
      .withIndex("by_conversationId_userId", (q) =>
        q.eq("conversationId", message.conversationId).eq("userId", currentUserId)
      )
      .unique();

    if (!membership) {
      throw new Error("You are not part of this conversation");
    }

    const reactions = message.reactions || [];
    const existingIndex = reactions.findIndex(
      (r) => r.emoji === args.emoji && r.userId === currentUserId
    );

    if (existingIndex > -1) {
      // Remove reaction
      reactions.splice(existingIndex, 1);
    } else {
      // Add reaction
      reactions.push({ emoji: args.emoji, userId: currentUserId });
    }

    await ctx.db.patch(args.messageId, {
      reactions,
    });
  },
});
