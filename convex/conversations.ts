import { ConvexError, v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getAuthUserId } from "./auth";

/**
 * Creates a new conversation between the logged-in user and another user.
 * If a conversation already exists, returns the existing one.
 */
export const createOrGet = mutation({
  args: {
    otherUserId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const currentUserId = await getAuthUserId(ctx);

    if (currentUserId === args.otherUserId) {
      throw new ConvexError("Cannot create conversation with yourself");
    }

    // Check if conversation already exists
    const myConversations = await ctx.db
      .query("conversationMembers")
      .withIndex("by_userId", (q) => q.eq("userId", currentUserId))
      .collect();

    for (const myMembership of myConversations) {
      const otherMembership = await ctx.db
        .query("conversationMembers")
        .withIndex("by_conversationId_userId", (q) =>
          q.eq("conversationId", myMembership.conversationId).eq("userId", args.otherUserId)
        )
        .unique();

      if (otherMembership) {
        // Conversation exists
        return myMembership.conversationId;
      }
    }

    // Create a new conversation if it doesn't exist
    const conversationId = await ctx.db.insert("conversations", {
      updatedAt: Date.now(),
    });

    // Add current user to conversation
    await ctx.db.insert("conversationMembers", {
      conversationId: conversationId,
      userId: currentUserId,
      unreadCount: 0,
    });

    // Add other user to conversation
    await ctx.db.insert("conversationMembers", {
      conversationId: conversationId,
      userId: args.otherUserId,
      unreadCount: 0,
    });

    return conversationId;
  },
});

/**
 * Gets all conversations for the logged in user along with the other user's info.
 */
export const getMyConversations = query({
  args: {},
  handler: async (ctx) => {
    try {
      const currentUserId = await getAuthUserId(ctx);

      const memberships = await ctx.db
        .query("conversationMembers")
        .withIndex("by_userId", (q) => q.eq("userId", currentUserId))
        .collect();

      const conversationsWithDetails = await Promise.all(
        memberships.map(async (membership) => {
          const conversation = await ctx.db.get(membership.conversationId);
          if (!conversation) return null;

          let otherUserDisplay = { _id: "" as any, name: "Unknown", imageUrl: undefined as string | undefined, isOnline: false };
          let isGroup = conversation.isGroup;

          if (isGroup) {
            otherUserDisplay.name = conversation.groupName || "Group Chat";
            // For a group, we might want to attach member count or something
          } else {
            // Find the other user in this conversation
            const members = await ctx.db
              .query("conversationMembers")
              .withIndex("by_conversationId", (q) => q.eq("conversationId", conversation._id))
              .collect();
              
            const otherUserId = members.find((m) => m.userId !== currentUserId)?.userId;
            if (otherUserId) {
              const otherUser = await ctx.db.get(otherUserId);
              if (otherUser) {
                otherUserDisplay = {
                  _id: otherUser._id,
                  name: otherUser.name,
                  imageUrl: otherUser.imageUrl,
                  isOnline: otherUser.isOnline && (Date.now() - otherUser.lastSeen < 60000),
                };
              }
            }
          }

          let lastMessage = null;
          if (conversation.lastMessageId) {
            lastMessage = await ctx.db.get(conversation.lastMessageId);
          }

          return {
            _id: conversation._id,
            updatedAt: conversation.updatedAt,
            unreadCount: membership.unreadCount,
            isGroup: conversation.isGroup || false,
            otherUser: otherUserDisplay,
            lastMessage: lastMessage ? {
              content: lastMessage.content,
              createdAt: lastMessage.createdAt,
              senderId: lastMessage.senderId
            } : null,
          };
        })
      );

      // Filter out nulls and sort by updated At descending
      return conversationsWithDetails
        .filter((c): c is NonNullable<typeof c> => c !== null)
        .sort((a, b) => b.updatedAt - a.updatedAt);
    } catch {
      return []; // Not logged in or error
    }
  },
});

/**
 * Marks all messages in a conversation as read for the current user
 */
export const markAsRead = mutation({
  args: {
    conversationId: v.id("conversations")
  },
  handler: async (ctx, args) => {
    const currentUserId = await getAuthUserId(ctx);
    
    const membership = await ctx.db
      .query("conversationMembers")
      .withIndex("by_conversationId_userId", (q) => 
        q.eq("conversationId", args.conversationId).eq("userId", currentUserId)
      )
      .unique();
      
    if (membership && membership.unreadCount > 0) {
      await ctx.db.patch(membership._id, { unreadCount: 0 });
    }
  }
});

/**
 * Get individual conversation details (including other user info)
 */
export const getById = query({
  args: { conversationId: v.id("conversations") },
  handler: async (ctx, args) => {
    try {
      const currentUserId = await getAuthUserId(ctx);
      
      const membership = await ctx.db
        .query("conversationMembers")
        .withIndex("by_conversationId_userId", (q) => 
          q.eq("conversationId", args.conversationId).eq("userId", currentUserId)
        )
        .unique();
        
      if (!membership) throw new ConvexError("Not a member of this conversation");
      
      const conversation = await ctx.db.get(args.conversationId);
      if (!conversation) throw new ConvexError("Conversation not found");

      let otherUserDisplay = { _id: "" as any, name: "Unknown", imageUrl: undefined as string | undefined, isOnline: false, lastSeen: 0, memberCount: 0 };
      
      const members = await ctx.db
        .query("conversationMembers")
        .withIndex("by_conversationId", (q) => q.eq("conversationId", args.conversationId))
        .collect();

      if (conversation.isGroup) {
        otherUserDisplay.name = conversation.groupName || "Group";
        otherUserDisplay.memberCount = members.length;
      } else {
        const otherUserMembership = members.find(m => m.userId !== currentUserId);
        if (otherUserMembership) {
          const otherUser = await ctx.db.get(otherUserMembership.userId);
          if (otherUser) {
            otherUserDisplay = {
               _id: otherUser._id,
               name: otherUser.name,
               imageUrl: otherUser.imageUrl,
               isOnline: otherUser.isOnline && (Date.now() - otherUser.lastSeen < 60000),
               lastSeen: otherUser.lastSeen,
               memberCount: 2
            };
          }
        }
      }
      
      return {
        _id: args.conversationId,
        isGroup: conversation.isGroup || false,
        otherUser: otherUserDisplay
      };
    } catch {
      return null;
    }
  }
});

/**
 * Create a group conversation
 */
export const createGroup = mutation({
  args: {
    name: v.string(),
    memberIds: v.array(v.id("users")),
  },
  handler: async (ctx, args) => {
    const currentUserId = await getAuthUserId(ctx);

    const conversationId = await ctx.db.insert("conversations", {
      updatedAt: Date.now(),
      isGroup: true,
      groupName: args.name,
    });

    const allMembers = Array.from(new Set([...args.memberIds, currentUserId]));

    for (const userId of allMembers) {
      await ctx.db.insert("conversationMembers", {
        conversationId,
        userId,
        unreadCount: 0,
      });
    }

    return conversationId;
  },
});
