import { v } from "convex/values";
import { mutation, query, action } from "./_generated/server";
import { getAuthUserId } from "./auth";

/**
 * Update the user's online status
 * Typically called when a user opens the app or pings it.
 */
export const updatePresence = mutation({
  args: {
    isOnline: v.boolean(),
  },
  handler: async (ctx, args) => {
    try {
      const currentUserId = await getAuthUserId(ctx);
      await ctx.db.patch(currentUserId, {
        isOnline: args.isOnline,
        lastSeen: Date.now(),
      });
    } catch {
      // Ignored if unauthenticated
    }
  },
});

/**
 * Set typing status for a conversation
 */
export const setTyping = mutation({
  args: {
    conversationId: v.id("conversations"),
    isTyping: v.boolean(),
  },
  handler: async (ctx, args) => {
    const currentUserId = await getAuthUserId(ctx);

    const existingStatus = await ctx.db
      .query("typingStatus")
      .withIndex("by_conversationId_userId", (q) =>
        q.eq("conversationId", args.conversationId).eq("userId", currentUserId)
      )
      .unique();

    if (existingStatus) {
      await ctx.db.patch(existingStatus._id, {
        isTyping: args.isTyping,
        updatedAt: Date.now(),
      });
    } else {
      await ctx.db.insert("typingStatus", {
        conversationId: args.conversationId,
        userId: currentUserId,
        isTyping: args.isTyping,
        updatedAt: Date.now(),
      });
    }
  },
});

/**
 * Get other user's typing status (we just check all users' typing status for the conversation
 * except current user and see if anyone is typing within the last 3-4 seconds).
 */
export const getTypingStatus = query({
  args: {
    conversationId: v.id("conversations"),
  },
  handler: async (ctx, args) => {
    try {
      const currentUserId = await getAuthUserId(ctx);

      const allTypingStatuses = await ctx.db
        .query("typingStatus")
        .withIndex("by_conversationId", (q) => q.eq("conversationId", args.conversationId))
        .collect();

      const currentlyTypingUsers = await Promise.all(
        allTypingStatuses
          .filter(
            (status) => status.userId !== currentUserId && status.isTyping && Date.now() - status.updatedAt < 5000 // Only show typing if updated in the last 5s
          )
          .map(async (status) => {
            const user = await ctx.db.get(status.userId);
            return user?.name || "Someone";
          })
      );

      return currentlyTypingUsers;
    } catch {
      return [];
    }
  },
});
