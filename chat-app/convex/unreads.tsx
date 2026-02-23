import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const getMyUnreads = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) =>
        q.eq("clerkId", identity.subject)
      )
      .first();

    if (!user) return [];

    return await ctx.db
      .query("unreads")
      .withIndex("by_user", (q) =>
        q.eq("userId", user._id)
      )
      .collect();
  },
});

export const clearUnread = mutation({
  args: {
    conversationId: v.id("conversations"),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return;

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) =>
        q.eq("clerkId", identity.subject)
      )
      .first();

    if (!user) return;

    const unread = await ctx.db
      .query("unreads")
      .withIndex("by_conversation_user", (q) =>
        q.eq("conversationId", args.conversationId)
         .eq("userId", user._id)
      )
      .first();

    if (unread) {
      await ctx.db.patch(unread._id, { count: 0 });
    }
  },
});