import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  // Users synchronized from Clerk
  users: defineTable({
    clerkId: v.string(),
    email: v.string(),
    name: v.string(),
    imageUrl: v.optional(v.string()), // avatar from Clerk
    isOnline: v.boolean(),
    lastSeen: v.number(),
  })
    .index("by_clerkId", ["clerkId"])
    .index("by_email", ["email"])
    .index("by_name", ["name"]),

  // Conversations (1-on-1 or groups)
  conversations: defineTable({
    lastMessageId: v.optional(v.id("messages")),
    updatedAt: v.number(),
    isGroup: v.optional(v.boolean()),
    groupName: v.optional(v.string()),
  }).index("by_updatedAt", ["updatedAt"]),

  // Links a user to a conversation
  conversationMembers: defineTable({
    conversationId: v.id("conversations"),
    userId: v.id("users"),
    unreadCount: v.number(),
  })
    .index("by_conversationId", ["conversationId"])
    .index("by_userId", ["userId"])
    .index("by_conversationId_userId", ["conversationId", "userId"]),

  // Individual messages within a conversation
  messages: defineTable({
    conversationId: v.id("conversations"),
    senderId: v.id("users"),
    content: v.string(),
    createdAt: v.number(),
    isDeleted: v.optional(v.boolean()),
    reactions: v.optional(
      v.array(
        v.object({
          emoji: v.string(),
          userId: v.id("users"),
        })
      )
    ),
  })
    .index("by_conversationId", ["conversationId"])
    .index("by_senderId", ["senderId"]),

  // Ephemeral status indicator (cleaned up automatically or on send)
  typingStatus: defineTable({
    conversationId: v.id("conversations"),
    userId: v.id("users"),
    isTyping: v.boolean(),
    updatedAt: v.number(), // use to auto-remove stale typing indicators
  })
    .index("by_conversationId", ["conversationId"])
    .index("by_userId", ["userId"])
    .index("by_conversationId_userId", ["conversationId", "userId"]),
});
