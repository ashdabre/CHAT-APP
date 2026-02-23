import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  users: defineTable({
    clerkId: v.string(),
    name: v.string(),
    email: v.string(),
    avatarUrl: v.optional(v.string()),
    lastSeen: v.number(),
  }).index("by_clerkId", ["clerkId"]),

  conversations: defineTable({
    isGroup: v.boolean(),
    name: v.optional(v.string()),
    createdAt: v.number(),
  }),

  conversationMembers: defineTable({
    conversationId: v.id("conversations"),
    userId: v.id("users"),
    lastReadAt: v.number(),
  })
    .index("by_conversation", ["conversationId"])
    .index("by_user", ["userId"])
    .index("by_user_conversation", ["userId", "conversationId"]),

  messages: defineTable({
    conversationId: v.id("conversations"),
    senderId: v.id("users"),

    // Message type
    type: v.union(v.literal("text"), v.literal("image"), v.literal("file")),

    // For text messages
    content: v.optional(v.string()),

    // For file/image messages
    fileId: v.optional(v.id("_storage")),
    fileName: v.optional(v.string()),

    deleted: v.boolean(),

    // Reactions: emoji -> array of user IDs
    reactions: v.record(v.string(), v.array(v.id("users"))),

    seenBy: v.array(v.id("users")),

    createdAt: v.number(),
  })
    .index("by_conversation", ["conversationId"])
    .index("by_sender", ["senderId"]),

  typingIndicators: defineTable({
    conversationId: v.id("conversations"),
    userId: v.id("users"),
    lastTyping: v.number(),
  })
    .index("by_conversation", ["conversationId"])
    .index("by_user_conversation", ["userId", "conversationId"]),

  unreads: defineTable({
    conversationId: v.id("conversations"),
    userId: v.id("users"),
    count: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_conversation_user", ["conversationId", "userId"]),
});