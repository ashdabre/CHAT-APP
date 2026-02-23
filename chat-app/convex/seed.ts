import { mutation } from "./_generated/server";
import { v } from "convex/values";

export const seedDummyData = mutation({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated – run this mutation while logged in");

    // Try to find user by clerkId (normal app usage)
    let currentUser = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", identity.subject))
      .first();

    // If not found, try by _id (dashboard "Act as a user" uses _id as subject)
    if (!currentUser) {
      console.log("User not found by clerkId, trying by _id...");
      const userById = await ctx.db.get(identity.subject as any);
      // Check if it's actually a user document (has clerkId field)
      if (userById && "clerkId" in userById) {
        currentUser = userById as unknown as typeof currentUser;
      }
    }

    if (!currentUser) {
      throw new Error(
        `Current user not found in DB – tried clerkId: ${identity.subject} and as _id.`
      );
    }

    const me = currentUser;
    console.log(`Seeding data for user ${me.name} (${me._id})`);

    // Get all other users
    const allUsers = await ctx.db.query("users").collect();
    const otherUsers = allUsers.filter((u) => u._id !== me._id);
    if (otherUsers.length === 0) {
      throw new Error("No other users found – need at least 2 users total");
    }

    // Helper to create or get a DM
    async function getOrCreateDM(otherUserId: typeof me._id) {
      // Look for existing DM
      const memberships = await ctx.db
        .query("conversationMembers")
        .withIndex("by_user", (q) => q.eq("userId", me._id))
        .collect();

      for (const m of memberships) {
        const convo = await ctx.db.get(m.conversationId);
        if (!convo || convo.isGroup) continue;

        const members = await ctx.db
          .query("conversationMembers")
          .withIndex("by_conversation", (q) => q.eq("conversationId", convo._id))
          .collect();

        if (members.length === 2 && members.some((mem) => mem.userId === otherUserId)) {
          return convo._id;
        }
      }

      // Create new DM
      const convoId = await ctx.db.insert("conversations", {
        isGroup: false,
        createdAt: Date.now(),
      });
      await ctx.db.insert("conversationMembers", {
        conversationId: convoId,
        userId: me._id,
        lastReadAt: Date.now(),
      });
      await ctx.db.insert("conversationMembers", {
        conversationId: convoId,
        userId: otherUserId,
        lastReadAt: Date.now(),
      });
      return convoId;
    }

    // 1. For each other user, create a DM and send 2-3 messages from them to you
    for (const other of otherUsers.slice(0, 3)) {
      const convoId = await getOrCreateDM(other._id);

      const now = Date.now();
      const messages = [
        {
          content: `Hey ${me.name}! This is a message from ${other.name}.`,
          createdAt: now - 1000 * 60 * 60 * 2, // 2 hours ago
        },
        {
          content: "How are you doing?",
          createdAt: now - 1000 * 60 * 30, // 30 minutes ago
        },
        {
          content: "Check out this cool link: https://example.com",
          createdAt: now - 1000 * 60 * 5, // 5 minutes ago
        },
      ];

      for (const msg of messages) {
        await ctx.db.insert("messages", {
          conversationId: convoId,
          senderId: other._id,
          type: "text",
          content: msg.content,
          deleted: false,
          reactions: {},
          seenBy: [], // current user has not seen these
          createdAt: msg.createdAt,
        });

        const unread = await ctx.db
          .query("unreads")
          .withIndex("by_conversation_user", (q) =>
            q.eq("conversationId", convoId).eq("userId", me._id)
          )
          .first();

        if (unread) {
          await ctx.db.patch(unread._id, { count: unread.count + 1 });
        } else {
          await ctx.db.insert("unreads", {
            conversationId: convoId,
            userId: me._id,
            count: 1,
          });
        }
      }
    }

    // 2. Create a group conversation if we have at least 2 other users
    if (otherUsers.length >= 2) {
      const groupMemberIds = [otherUsers[0]._id, otherUsers[1]._id];
      const groupName = "Test Group";

      const groupId = await ctx.db.insert("conversations", {
        isGroup: true,
        name: groupName,
        createdAt: Date.now(),
      });

      for (const uid of [me._id, ...groupMemberIds]) {
        await ctx.db.insert("conversationMembers", {
          conversationId: groupId,
          userId: uid,
          lastReadAt: Date.now(),
        });
      }

      const now = Date.now();
      const groupMessages = [
        { sender: otherUsers[0], content: "Welcome to the group!", time: now - 1000 * 60 * 60 },
        { sender: otherUsers[1], content: "Hey everyone 👋", time: now - 1000 * 60 * 30 },
        { sender: otherUsers[0], content: "Anyone up for a call later?", time: now - 1000 * 60 * 10 },
      ];

      for (const gm of groupMessages) {
        await ctx.db.insert("messages", {
          conversationId: groupId,
          senderId: gm.sender._id,
          type: "text",
          content: gm.content,
          deleted: false,
          reactions: {},
          seenBy: [],
          createdAt: gm.time,
        });

        const unread = await ctx.db
          .query("unreads")
          .withIndex("by_conversation_user", (q) =>
            q.eq("conversationId", groupId).eq("userId", me._id)
          )
          .first();

        if (unread) {
          await ctx.db.patch(unread._id, { count: unread.count + 1 });
        } else {
          await ctx.db.insert("unreads", {
            conversationId: groupId,
            userId: me._id,
            count: 1,
          });
        }
      }
    }

    return { success: true, message: "Dummy data seeded successfully!" };
  },
});