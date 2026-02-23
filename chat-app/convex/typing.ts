import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

/**
 * Set typing status for current user in a conversation.
 */
export const setTyping = mutation({
  args: {
    conversationId: v.id("conversations"),
    isTyping: v.boolean(),
  },
  handler: async (ctx, { conversationId, isTyping }) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return;

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", identity.subject))
      .first();
    if (!user) return;

    const existing = await ctx.db
      .query("typingIndicators")
      .withIndex("by_user_conversation", (q) =>
        q.eq("userId", user._id).eq("conversationId", conversationId)
      )
      .first();

    if (isTyping) {
      const now = Date.now();
      if (existing) {
        await ctx.db.patch(existing._id, { lastTyping: now });
      } else {
        await ctx.db.insert("typingIndicators", {
          conversationId,
          userId: user._id,
          lastTyping: now,
        });
      }
    } else {
      if (existing) {
        await ctx.db.delete(existing._id);
      }
    }
  },
});

/**
 * Get currently typing users in a conversation.
 */
export const getTyping = query({
  args: { conversationId: v.id("conversations") },
  handler: async (ctx, { conversationId }) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];

    const currentUser = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", identity.subject))
      .first();
    if (!currentUser) return [];

    const typingUsers = await ctx.db
      .query("typingIndicators")
      .withIndex("by_conversation", (q) => q.eq("conversationId", conversationId))
      .collect();

    // Filter out current user and only include those who typed in last 3 seconds
    const now = Date.now();
    const userIds = typingUsers
      .filter((t) => t.userId !== currentUser._id && now - t.lastTyping < 3000)
      .map((t) => t.userId);

    // Get user details
    const users = await Promise.all(userIds.map((id) => ctx.db.get(id)));
    return users.filter(Boolean).map((u) => ({ _id: u!._id, name: u!.name }));
  },
});