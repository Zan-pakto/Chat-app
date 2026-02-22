import { v } from "convex/values";
import { internalMutation, internalQuery, query, mutation } from "./_generated/server";
import { getAuthUserId } from "./auth";

/**
 * Creates a new user in the Convex database.
 * This is meant to be called internally via the webhook after Clerk signs a user up.
 */
export const createUser = internalMutation({
  args: {
    clerkId: v.string(),
    email: v.string(),
    name: v.string(),
    imageUrl: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("users", {
      ...args,
      isOnline: true,
      lastSeen: Date.now(),
    });
  },
});

/**
 * Updates an existing user when they change their profile in Clerk.
 */
export const updateUser = internalMutation({
  args: {
    clerkId: v.string(),
    email: v.string(),
    name: v.string(),
    imageUrl: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", args.clerkId))
      .unique();

    if (!user) {
      throw new Error("User not found to update");
    }

    return await ctx.db.patch(user._id, {
      email: args.email,
      name: args.name,
      imageUrl: args.imageUrl,
    });
  },
});

/**
 * Internal query to check if a user is already recorded.
 */
export const internalGetUserByClerkId = internalQuery({
  args: { clerkId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", args.clerkId))
      .unique();
  },
});

/**
 * Get all users except the current one for showing in lists.
 */
export const getAllExceptCurrent = query({
  args: {},
  handler: async (ctx) => {
    try {
      const currentUserId = await getAuthUserId(ctx);
      const allUsers = await ctx.db.query("users").collect();
      // Filter out current user from array instead of querying because Convex queries don't have "not equal"
      return allUsers
        .filter((user) => user._id !== currentUserId)
        .map((user) => ({
          ...user,
          isOnline: user.isOnline && (Date.now() - user.lastSeen < 60000), // 1 minute cutoff
        }));
    } catch {
      return []; // Return empty array if unauthorized to avoid crashing UI before auth loaded
    }
  },
});

/**
 * Get current user
 */
export const getCurrentUser = query({
  args: {},
  handler: async (ctx) => {
    try {
        const currentUserId = await getAuthUserId(ctx);
        return await ctx.db.get(currentUserId);
    } catch {
        return null;
    }
  }
});

/**
 * Fallback to store user manually when frontend loads
 * if the webhook hasn't fired yet or failed.
 */
export const storeUser = mutation({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return null;
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", identity.subject))
      .unique();

    if (user !== null) {
      // Update if any fields changed
      if (
        user.name !== (identity.name || "") ||
        user.email !== (identity.email || "") ||
        user.imageUrl !== identity.pictureUrl
      ) {
        await ctx.db.patch(user._id, {
          name: identity.name || "User",
          email: identity.email || "",
          imageUrl: identity.pictureUrl,
          isOnline: true,
          lastSeen: Date.now(),
        });
      }
      return user._id;
    }

    // Insert new user
    return await ctx.db.insert("users", {
      clerkId: identity.subject,
      email: identity.email || "",
      name: identity.name || "User",
      imageUrl: identity.pictureUrl,
      isOnline: true,
      lastSeen: Date.now(),
    });
  },
});
