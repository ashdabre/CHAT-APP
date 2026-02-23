import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const syncUser = mutation({
  args: {
    clerkId: v.string(),
    name: v.string(),
    email: v.string(),
    avatarUrl: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    console.log("🔄 syncUser called with clerkId:", args.clerkId);

    const existingUser = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", args.clerkId))
      .first();
    console.log("🔄 existingUser:", existingUser?._id);

    if (existingUser) {
      await ctx.db.patch(existingUser._id, {
        name: args.name,
        email: args.email,
        avatarUrl: args.avatarUrl,
        lastSeen: Date.now(),
      });
      console.log("🔄 updated existing user:", existingUser._id);
      return existingUser._id;
    }

    const newId = await ctx.db.insert("users", {
      clerkId: args.clerkId,
      name: args.name,
      email: args.email,
      avatarUrl: args.avatarUrl,
      lastSeen: Date.now(),
    });
    console.log("🔄 inserted new user:", newId);
    return newId;
  },
});

export const getCurrentUser = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    console.log("👤 getCurrentUser identity:", identity?.subject);

    if (!identity) return null;

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", identity.subject))
      .first();
    console.log("👤 getCurrentUser found user:", user?._id);

    return user;
  },
});

export const getAllUsers = query({
  args: {},
  handler: async (ctx) => {
    // No authentication needed – return all users
    const users = await ctx.db.query("users").collect();
    console.log("👥 getAllUsers count:", users.length);
    return users;
  },
});

export const updateLastSeen = mutation({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    console.log("⏱️ updateLastSeen identity:", identity?.subject);

    if (!identity) return;

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", identity.subject))
      .first();
    console.log("⏱️ updateLastSeen user found:", user?._id);

    if (!user) return;

    await ctx.db.patch(user._id, {
      lastSeen: Date.now(),
    });
    console.log("⏱️ updated lastSeen for user:", user._id);
  },
});