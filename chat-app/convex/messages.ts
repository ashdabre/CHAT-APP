import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

/**
 * SEND TEXT MESSAGE
 */
export const sendMessage = mutation({
  args: {
    conversationId: v.id("conversations"),
    content: v.string(),
  },
  handler: async (ctx, { conversationId, content }) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", identity.subject))
      .unique();

    if (!user) throw new Error("User not found");

    const conversation = await ctx.db.get(conversationId);
    if (!conversation) throw new Error("Conversation not found");

    const messageId = await ctx.db.insert("messages", {
      conversationId,
      senderId: user._id,
      type: "text",               // ✅ NEW field
      content,                     // only used for text
      fileId: undefined,
      fileName: undefined,
      deleted: false,
      reactions: {},
      seenBy: [user._id],
      createdAt: Date.now(),
    });

    // Increment unread for others
    const members = await ctx.db
      .query("conversationMembers")
      .withIndex("by_conversation", (q) => q.eq("conversationId", conversationId))
      .collect();

    for (const member of members) {
      if (member.userId !== user._id) {
        const existingUnread = await ctx.db
          .query("unreads")
          .withIndex("by_conversation_user", (q) =>
            q.eq("conversationId", conversationId).eq("userId", member.userId)
          )
          .unique();

        if (existingUnread) {
          await ctx.db.patch(existingUnread._id, {
            count: existingUnread.count + 1,
          });
        } else {
          await ctx.db.insert("unreads", {
            conversationId,
            userId: member.userId,
            count: 1,
          });
        }
      }
    }

    return messageId;
  },
});

/**
 * GET MESSAGES
 */
export const getMessages = query({
  args: { conversationId: v.id("conversations") },
  handler: async (ctx, { conversationId }) => {
    return await ctx.db
      .query("messages")
      .withIndex("by_conversation", (q) => q.eq("conversationId", conversationId))
      .order("asc")
      .collect();
  },
});

/**
 * DELETE MESSAGE (only sender allowed)
 */
export const deleteMessage = mutation({
  args: { messageId: v.id("messages") },
  handler: async (ctx, { messageId }) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", identity.subject))
      .unique();

    if (!user) throw new Error("User not found");

    const message = await ctx.db.get(messageId);
    if (!message) throw new Error("Message not found");

    if (message.senderId !== user._id) throw new Error("Not allowed");

    await ctx.db.patch(messageId, {
      deleted: true,
      content: "This message was deleted",
    });
  },
});

/**
 * TOGGLE REACTION
 */
export const toggleReaction = mutation({
  args: {
    messageId: v.id("messages"),
    emoji: v.string(),
  },
  handler: async (ctx, { messageId, emoji }) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", identity.subject))
      .unique();

    if (!user) throw new Error("User not found");

    const message = await ctx.db.get(messageId);
    if (!message) throw new Error("Message not found");

    const reactions = message.reactions || {};
    const usersForEmoji = reactions[emoji] || [];

    const alreadyReacted = usersForEmoji.includes(user._id);

    if (alreadyReacted) {
      reactions[emoji] = usersForEmoji.filter((id: any) => id !== user._id);
    } else {
      reactions[emoji] = [...usersForEmoji, user._id];
    }

    await ctx.db.patch(messageId, { reactions });
  },
});

/**
 * MARK ALL MESSAGES AS SEEN
 */
export const markSeen = mutation({
  args: { conversationId: v.id("conversations") },
  handler: async (ctx, { conversationId }) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return;

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", identity.subject))
      .unique();

    if (!user) return;

    const messages = await ctx.db
      .query("messages")
      .withIndex("by_conversation", (q) => q.eq("conversationId", conversationId))
      .collect();

    for (const msg of messages) {
      if (!msg.seenBy?.includes(user._id)) {
        await ctx.db.patch(msg._id, {
          seenBy: [...(msg.seenBy || []), user._id],
        });
      }
    }
  },
});

// ========== NEW FILE UPLOAD MUTATIONS ==========

/**
 * GENERATE UPLOAD URL
 */
export const generateUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    return await ctx.storage.generateUploadUrl();
  },
});

/**
 * SEND FILE MESSAGE (image or generic file)
 */
export const sendFileMessage = mutation({
  args: {
    conversationId: v.id("conversations"),
    fileId: v.id("_storage"),
    fileName: v.string(),
    type: v.union(v.literal("image"), v.literal("file")),
  },
  handler: async (ctx, { conversationId, fileId, fileName, type }) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const currentUser = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", identity.subject))
      .unique();

    if (!currentUser) throw new Error("User not found");

    await ctx.db.insert("messages", {
      conversationId,
      senderId: currentUser._id,
      type,                       // "image" or "file"
      fileId,
      fileName,
      content: undefined,          // not used for files
      deleted: false,
      reactions: {},
      seenBy: [currentUser._id],
      createdAt: Date.now(),
    });

    // (Optional) increment unread counts here if you want – similar to sendMessage
    // For brevity, you can copy the unread logic from sendMessage above.
  },
  
});/**
 * GET SIGNED URL FOR A STORED FILE
 */
export const getFileUrl = query({
  args: { storageId: v.id("_storage") },
  handler: async (ctx, { storageId }) => {
    return await ctx.storage.getUrl(storageId);
  },
});