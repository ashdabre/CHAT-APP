import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

/**
 * CREATE OR GET DIRECT MESSAGE
 */
export const createOrGetDM = mutation({
  args: {
    otherUserId: v.id("users"),
  },
  handler: async (ctx, { otherUserId }) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const currentUser = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", identity.subject))
      .unique();

    if (!currentUser) throw new Error("User not found");
    if (currentUser._id === otherUserId) throw new Error("Cannot DM yourself");

    // Check existing DM
    const memberships = await ctx.db
      .query("conversationMembers")
      .withIndex("by_user", (q) => q.eq("userId", currentUser._id))
      .collect();

    for (const membership of memberships) {
      const convo = await ctx.db.get(membership.conversationId);
      if (!convo || convo.isGroup) continue;

      const members = await ctx.db
        .query("conversationMembers")
        .withIndex("by_conversation", (q) => q.eq("conversationId", convo._id))
        .collect();

      if (members.length === 2 && members.some((m) => m.userId === otherUserId)) {
        return convo._id;
      }
    }

    // Create new DM
    const conversationId = await ctx.db.insert("conversations", {
      isGroup: false,
      createdAt: Date.now(),
    });

    await ctx.db.insert("conversationMembers", {
      conversationId,
      userId: currentUser._id,
      lastReadAt: Date.now(),
    });

    await ctx.db.insert("conversationMembers", {
      conversationId,
      userId: otherUserId,
      lastReadAt: Date.now(),
    });

    return conversationId;
  },
});

/**
 * CREATE GROUP CONVERSATION
 */
export const createGroup = mutation({
  args: {
    name: v.string(),
    userIds: v.array(v.id("users")),
  },
  handler: async (ctx, { name, userIds }) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const currentUser = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", identity.subject))
      .unique();

    if (!currentUser) throw new Error("User not found");

    // Create group conversation
    const conversationId = await ctx.db.insert("conversations", {
      isGroup: true,
      name,
      createdAt: Date.now(),
    });

    // Add creator automatically
    const allMembers = [
      currentUser._id,
      ...userIds.filter((id) => id !== currentUser._id),
    ];

    for (const userId of allMembers) {
      await ctx.db.insert("conversationMembers", {
        conversationId,
        userId,
        lastReadAt: Date.now(),
      });
    }

    return conversationId;
  },
});

/**
 * GET ALL CONVERSATIONS FOR CURRENT USER (with members and last message)
 */
export const getMyConversations = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];

    const currentUser = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", identity.subject))
      .unique();

    if (!currentUser) return [];

    const memberships = await ctx.db
      .query("conversationMembers")
      .withIndex("by_user", (q) => q.eq("userId", currentUser._id))
      .collect();

    const conversations = [];

    for (const membership of memberships) {
      const convo = await ctx.db.get(membership.conversationId);
      if (!convo) continue;

      // Get all members of this conversation
      const convoMembers = await ctx.db
        .query("conversationMembers")
        .withIndex("by_conversation", (q) => q.eq("conversationId", convo._id))
        .collect();
      const memberIds = convoMembers.map((m) => m.userId);

      const lastMessage = await ctx.db
        .query("messages")
        .withIndex("by_conversation", (q) => q.eq("conversationId", convo._id))
        .order("desc")
        .first();

      conversations.push({
        ...convo,
        members: memberIds,
        lastMessage,
      });
    }

    // Sort by most recent message
    return conversations.sort(
      (a, b) => (b.lastMessage?.createdAt ?? 0) - (a.lastMessage?.createdAt ?? 0)
    );
  },
});

/**
 * GET A SINGLE CONVERSATION BY ID (with members and last message)
 */
export const getConversation = query({
  args: { conversationId: v.id("conversations") },
  handler: async (ctx, { conversationId }) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;

    const currentUser = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", identity.subject))
      .first();
    if (!currentUser) return null;

    const conversation = await ctx.db.get(conversationId);
    if (!conversation) return null;

    // Optionally check membership – uncomment if you want to restrict access
    // const member = await ctx.db
    //   .query("conversationMembers")
    //   .withIndex("by_conversation_user", (q) =>
    //     q.eq("conversationId", conversationId).eq("userId", currentUser._id)
    //   )
    //   .first();
    // if (!member) return null;

    const members = await ctx.db
      .query("conversationMembers")
      .withIndex("by_conversation", (q) => q.eq("conversationId", conversationId))
      .collect();
    const memberIds = members.map((m) => m.userId);

    const lastMessage = await ctx.db
      .query("messages")
      .withIndex("by_conversation", (q) => q.eq("conversationId", conversationId))
      .order("desc")
      .first();

    return {
      ...conversation,
      members: memberIds,
      lastMessage,
    };
  },
});