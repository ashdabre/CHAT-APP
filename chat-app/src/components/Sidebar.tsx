"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useRouter, usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import { UserButton, useUser } from "@clerk/nextjs";
import { Id } from "../../convex/_generated/dataModel";

// ─── Helpers ────────────────────────────────────────────────────────────────

function formatRelativeTime(ts: number) {
  const diff = Date.now() - ts;
  const m = Math.floor(diff / 60000);
  const h = Math.floor(diff / 3600000);
  const d = Math.floor(diff / 86400000);
  if (m < 1) return "now";
  if (m < 60) return `${m}m`;
  if (h < 24) return `${h}h`;
  if (d < 7) return `${d}d`;
  return new Date(ts).toLocaleDateString([], { month: "short", day: "numeric" });
}


const PALETTE = [
  ["#f97316", "#ea580c"],
  ["#8b5cf6", "#7c3aed"],
  ["#06b6d4", "#0891b2"],
  ["#ec4899", "#db2777"],
  ["#10b981", "#059669"],
  ["#f59e0b", "#d97706"],
  ["#3b82f6", "#2563eb"],
  ["#ef4444", "#dc2626"],
];

function getGradient(name: string) {
  return PALETTE[name.charCodeAt(0) % PALETTE.length];
}

function getInitials(name: string) {
  return name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

// ─── Avatar ─────────────────────────────────────────────────────────────────

function Avatar({
  name,
  online,
  size = 40,
  showDot = true,
}: {
  name: string;
  online?: boolean;
  size?: number;
  showDot?: boolean;
}) {
  const [c1, c2] = getGradient(name);
  const dotSize = Math.round(size * 0.3);
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <div
        className="rounded-full flex items-center justify-center text-white font-bold select-none"
        style={{
          width: size,
          height: size,
          background: `linear-gradient(135deg, ${c1}, ${c2})`,
          fontSize: size * 0.35,
          boxShadow: `0 2px 10px ${c1}44`,
        }}
      >
        {getInitials(name)}
      </div>
      {showDot && online !== undefined && (
        <span
          className="absolute rounded-full border-2 border-white"
          style={{
            width: dotSize,
            height: dotSize,
            bottom: 0,
            right: 0,
            background: online ? "#22c55e" : "#9ca3af",
          }}
        />
      )}
    </div>
  );
}

// Stacked group avatar
function GroupAvatar({ names }: { names: string[] }) {
  const shown = names.slice(0, 3);
  const offsets = [
    { top: 0, left: 0 },
    { top: 12, left: 12 },
    { top: 2, left: 22 },
  ];
  return (
    <div className="relative shrink-0" style={{ width: 40, height: 40 }}>
      {shown.map((n, i) => {
        const [c1, c2] = getGradient(n);
        return (
          <div
            key={i}
            className="absolute rounded-full flex items-center justify-center text-white font-bold"
            style={{
              width: 22,
              height: 22,
              background: `linear-gradient(135deg, ${c1}, ${c2})`,
              fontSize: 8,
              border: "2px solid white",
              top: offsets[i]?.top ?? 0,
              left: offsets[i]?.left ?? 0,
              zIndex: 3 - i,
            }}
          >
            {getInitials(n)}
          </div>
        );
      })}
    </div>
  );
}

// ─── Create Group Modal ──────────────────────────────────────────────────────

function CreateGroupModal({
  users,
  onClose,
  onCreate,
}: {
  users: any[];
  onClose: () => void;
  onCreate: (name: string, userIds: Id<"users">[]) => void;
}) {
  const [groupName, setGroupName] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState("");

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const filtered = users.filter((u) =>
    u.name.toLowerCase().includes(search.toLowerCase())
  );

  const canCreate = groupName.trim().length > 0 && selected.size >= 2;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-white rounded-3xl w-[380px] flex flex-col overflow-hidden shadow-2xl max-h-[82vh]">
        {/* Header */}
        <div className="px-6 pt-6 pb-4 border-b border-gray-200">
          <div className="flex items-start justify-between mb-5">
            <div>
              <h2 className="font-bold text-lg text-gray-900">New Group</h2>
              <p className="text-xs mt-1 text-gray-500">
                Add at least 2 people to create a group
              </p>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-xl flex items-center justify-center text-sm bg-gray-100 text-gray-500 hover:bg-gray-200"
            >
              ✕
            </button>
          </div>

          {/* Group name input */}
          <div className="relative mb-3">
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-base">💬</span>
            <input
              placeholder="Group name..."
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              className="w-full rounded-2xl pl-10 pr-4 py-3 text-sm border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Search members */}
          <div className="relative">
            <svg className="absolute left-3.5 top-1/2 -translate-y-1/2" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2.5">
              <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              placeholder="Search people..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-2xl pl-10 pr-4 py-3 text-sm border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Selected chips */}
          {selected.size > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-3">
              {users
                .filter((u) => selected.has(u._id))
                .map((u) => (
                  <button
                    key={u._id}
                    onClick={() => toggle(u._id)}
                    className="flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold bg-blue-100 text-blue-700 border border-blue-300"
                  >
                    {u.name.split(" ")[0]}
                    <span className="text-blue-500 text-xs">✕</span>
                  </button>
                ))}
            </div>
          )}
        </div>

        {/* User list */}
        <div className="flex-1 overflow-y-auto py-2">
          {filtered.length === 0 ? (
            <p className="text-center py-8 text-sm text-gray-500">No users found</p>
          ) : (
            filtered.map((u) => {
              const isSel = selected.has(u._id);
              return (
                <button
                  key={u._id}
                  onClick={() => toggle(u._id)}
                  className={`w-full flex items-center gap-3 px-5 py-3 transition text-left ${isSel ? "bg-blue-50" : "hover:bg-gray-50"}`}
                >
                  <Avatar name={u.name} size={38} showDot={false} />
                  <span className="flex-1 text-sm font-medium text-gray-800">{u.name}</span>
                  <div
                    className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 transition-all border ${
                      isSel ? "bg-blue-500 border-blue-500" : "border-gray-300"
                    }`}
                  >
                    {isSel && (
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    )}
                  </div>
                </button>
              );
            })
          )}
        </div>

        {/* Create button */}
        <div className="p-5 border-t border-gray-200">
          <button
            disabled={!canCreate}
            onClick={() => {
              onCreate(groupName.trim(), [...selected] as Id<"users">[]);
              onClose();
            }}
            className={`w-full py-3.5 rounded-2xl font-bold text-sm transition-all ${
              canCreate
                ? "bg-blue-500 text-white hover:bg-blue-600"
                : "bg-gray-100 text-gray-400 cursor-not-allowed"
            }`}
          >
            {!groupName.trim()
              ? "Enter a group name"
              : selected.size < 2
              ? `Select ${2 - selected.size} more member${2 - selected.size !== 1 ? "s" : ""}`
              : `Create "${groupName}" · ${selected.size} members`}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Person Row (People tab) ─────────────────────────────────────────────────

function PersonRow({
  user,
  online,
  onClick,
}: {
  user: any;
  online: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-2xl mb-0.5 transition-all group text-left hover:bg-gray-100"
    >
      <Avatar name={user.name} online={online} size={38} />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold truncate text-gray-800">{user.name}</p>
        <p className="text-xs text-gray-500">{online ? "Active now" : "Offline"}</p>
      </div>
      <span className="text-xs font-semibold px-2.5 py-1 rounded-xl bg-blue-100 text-blue-700 opacity-0 group-hover:opacity-100 transition-all shrink-0">
        Chat
      </span>
    </button>
  );
}

// ─── Sidebar ─────────────────────────────────────────────────────────────────

export default function Sidebar() {
  const router = useRouter();
  const pathname = usePathname();
  const { user: clerkUser, isLoaded: clerkLoaded } = useUser();
const seed=useMutation(api.seed.seedDummyData);

  const allUsers = useQuery(api.users.getAllUsers);
  const conversations = useQuery(api.conversations.getMyConversations);
  const unreads = useQuery(api.unreads.getMyUnreads);

  const createDM = useMutation(api.conversations.createOrGetDM);
  const createGroup = useMutation(api.conversations.createGroup);
  const updateLastSeen = useMutation(api.users.updateLastSeen);

  const [search, setSearch] = useState("");
  const [tab, setTab] = useState<"chats" | "people">("chats");
  const [showGroupModal, setShowGroupModal] = useState(false);

  useEffect(() => {
    if (!clerkUser) return;
    updateLastSeen();
    const interval = setInterval(() => updateLastSeen(), 10000);
    return () => clearInterval(interval);
  }, [clerkUser, updateLastSeen]);

  if (!clerkLoaded || !allUsers || !conversations || !unreads) {
    return (
      <div className="w-80 h-screen flex items-center justify-center bg-white border-r border-gray-200">
        <div className="w-10 h-10 border-4 border-blue-200 border-t-blue-500 rounded-full animate-spin" />
      </div>
    );
  }

  const otherUsers = allUsers.filter((u) => u.clerkId !== clerkUser?.id);
  const isOnline = (ts: number) => Date.now() - ts < 30000;
  const userMap = Object.fromEntries(allUsers.map((u) => [u._id, u]));

  // Enrich conversations with member details
  const enriched = conversations.map((convo) => {
    let otherUser = null;
    let groupMembers: any[] = [];

    const memberIds = (convo as any).members ?? [];

    if (!convo.isGroup) {
      const otherId = memberIds.find((id: string) => {
        const u = allUsers.find((u) => u._id === id);
        return u && u.clerkId !== clerkUser?.id;
      });
      otherUser = otherId ? userMap[otherId] : null;
    } else {
      groupMembers = memberIds
        .map((id: string) => userMap[id])
        .filter(Boolean)
        .filter((u: any) => u.clerkId !== clerkUser?.id);
    }

    return { ...convo, otherUser, groupMembers };
  });

  const filteredConversations = enriched.filter((c) => {
    if (!search) return true;
    const name = c.isGroup ? (c.name ?? "Group") : (c.otherUser?.name ?? "");
    return name.toLowerCase().includes(search.toLowerCase());
  });

  const filteredUsers = otherUsers.filter((u) =>
    u.name.toLowerCase().includes(search.toLowerCase())
  );

  const activeConvoId = pathname?.split("/chat/")?.[1] ?? null;
  const onlineCount = otherUsers.filter((u) => isOnline(u.lastSeen)).length;

  const handleStartDM = async (userId: Id<"users">) => {
    const id = await createDM({ otherUserId: userId });
    router.push(`/chat/${id}`);
    setSearch("");
    setTab("chats");
  };

  const handleCreateGroup = async (name: string, userIds: Id<"users">[]) => {
    const id = await createGroup({ name, userIds });
    router.push(`/chat/${id}`);
    setTab("chats");
  };

  return (
    <>
      {showGroupModal && (
        <CreateGroupModal
          users={otherUsers}
          onClose={() => setShowGroupModal(false)}
          onCreate={handleCreateGroup}
        />
      )}

      <div className="w-80 h-screen bg-white border-r border-gray-200 flex flex-col">
        {/* Header */}
        <div className="px-4 pt-6 pb-3 border-b border-gray-200">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h1 className="font-extrabold text-xl text-gray-900">Messages</h1>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
                <span className="text-xs text-gray-500">{onlineCount} online</span>
              </div>
            </div>
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setShowGroupModal(true)}
                title="New Group"
                className="w-8 h-8 rounded-xl bg-blue-100 text-blue-700 hover:bg-blue-200 flex items-center justify-center"
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                  <circle cx="9" cy="7" r="4" />
                  <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                  <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                </svg>
              </button>
              <button
                onClick={() => setTab("people")}
                title="New Message"
                className="w-8 h-8 rounded-xl bg-gray-100 text-gray-600 hover:bg-gray-200 flex items-center justify-center"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                  <line x1="12" y1="8" x2="12" y2="14" />
                  <line x1="9" y1="11" x2="15" y2="11" />
                </svg>
              </button>
              <UserButton afterSignOutUrl="/" />
            </div>
          </div>

          {/* Search */}
          <div className="flex items-center gap-2.5 rounded-2xl px-3.5 py-2.5 mb-3 border border-gray-200 bg-gray-50">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2.5">
              <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              placeholder="Search..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="flex-1 bg-transparent outline-none text-sm text-gray-800"
            />
            {search && (
              <button onClick={() => setSearch("")} className="text-gray-400">
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                  <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            )}
          </div>

          {/* Tabs */}
          <div className="flex gap-1 rounded-2xl p-1 bg-gray-100">
            {(["chats", "people"] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`flex-1 py-1.5 rounded-xl text-xs font-bold transition-all capitalize ${
                  tab === t ? "bg-white text-blue-600 shadow" : "text-gray-600"
                }`}
              >
                {t === "chats" ? "💬 Chats" : "👥 People"}
              </button>
            ))}
          </div>
        </div>

        {/* Scrollable list */}
        <div className="flex-1 overflow-y-auto px-2 pb-3">
          {tab === "chats" && (
            <>
              {filteredConversations.length === 0 ? (
                <div className="flex flex-col items-center justify-center gap-3 py-20 px-6 text-center">
                  <div className="w-14 h-14 rounded-2xl bg-blue-100 flex items-center justify-center text-2xl">💬</div>
                  <p className="text-sm text-gray-500">
                    {search ? "No chats found." : "No conversations yet."}
                  </p>
                  <button
                    onClick={() => setTab("people")}
                    className="text-xs font-semibold text-blue-600"
                  >
                    Browse People →
                  </button>
                </div>
              ) : (
                filteredConversations.map((convo) => {
                  const unread = unreads.find((u) => u.conversationId === convo._id);
                  const hasUnread = unread && unread.count > 0;
                  const isActive = activeConvoId === convo._id;
                  const isGroup = convo.isGroup;

                  let displayName = "Direct Message";
                  if (isGroup) {
                    displayName = convo.name ?? "Group Chat";
                  } else if (convo.otherUser) {
                    displayName = convo.otherUser.name;
                  }

                  const online = !isGroup && convo.otherUser ? isOnline(convo.otherUser.lastSeen) : false;
                  const lastMsg = convo.lastMessage;
                  const memberNames = (convo.groupMembers ?? []).map((m: any) => m.name);

                  return (
                    <button
                      key={convo._id}
                      onClick={() => router.push(`/chat/${convo._id}`)}
                      className={`w-full flex items-center gap-3 px-3 py-3 rounded-2xl mb-0.5 transition-all text-left group ${
                        isActive ? "bg-blue-50 border border-blue-200" : "hover:bg-gray-100"
                      }`}
                    >
                      {isGroup ? (
                        <GroupAvatar names={memberNames} />
                      ) : (
                        <Avatar name={displayName} online={online} />
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-1">
                          <div className="flex items-center gap-1.5 min-w-0">
                            <span className={`text-sm truncate ${hasUnread ? "font-bold text-gray-900" : "text-gray-700"}`}>
                              {displayName}
                            </span>
                            {isGroup && (
                              <span className="shrink-0 text-[9px] font-bold px-1.5 py-0.5 rounded-full uppercase bg-blue-100 text-blue-700">
                                group
                              </span>
                            )}
                          </div>
                          {lastMsg && (
                            <span className={`text-[10px] shrink-0 ${hasUnread ? "text-blue-600" : "text-gray-400"}`}>
                              {formatRelativeTime(lastMsg.createdAt ?? Date.now())}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center justify-between mt-0.5 gap-1">
                          <p className={`text-xs truncate max-w-[155px] ${hasUnread ? "text-gray-700 font-medium" : "text-gray-500"}`}>
                            {lastMsg?.deleted ? "🚫 Deleted" : lastMsg?.content ?? "No messages yet"}
                          </p>
                          {hasUnread && (
                            <span className="shrink-0 text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-blue-500 text-white min-w-[18px] text-center">
                              {unread.count > 99 ? "99+" : unread.count}
                            </span>
                          )}
                        </div>
                      </div>
                    </button>
                  );
                })
              )}
            </>
          )}

          {tab === "people" && (
            <>
              <button
                onClick={() => setShowGroupModal(true)}
                className="w-full flex items-center gap-3 px-3 py-3 rounded-2xl mb-3 transition-all bg-blue-50 border border-blue-200 hover:bg-blue-100"
              >
                <div className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center shrink-0 shadow-md">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5">
                    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                    <circle cx="9" cy="7" r="4" />
                    <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                  </svg>
                </div>
                <div className="text-left">
                  <p className="text-sm font-bold text-blue-800">Create Group Chat</p>
                  <p className="text-xs text-gray-600">Select 2+ people to group</p>
                </div>
              </button>

              {filteredUsers.some((u) => isOnline(u.lastSeen)) && (
                <>
                  <div className="px-2 pb-1">
                    <span className="text-xs font-bold uppercase tracking-widest text-green-600">● Online</span>
                  </div>
                  {filteredUsers
                    .filter((u) => isOnline(u.lastSeen))
                    .map((u) => (
                      <PersonRow key={u._id} user={u} online={true} onClick={() => handleStartDM(u._id)} />
                    ))}
                </>
              )}

              {filteredUsers.some((u) => !isOnline(u.lastSeen)) && (
                <>
                  <div className="px-2 pt-3 pb-1">
                    <span className="text-xs font-bold uppercase tracking-widest text-gray-400">○ Offline</span>
                  </div>
                  {filteredUsers
                    .filter((u) => !isOnline(u.lastSeen))
                    .map((u) => (
                      <PersonRow key={u._id} user={u} online={false} onClick={() => handleStartDM(u._id)} />
                    ))}
                </>
              )}

              {filteredUsers.length === 0 && (
                <div className="flex flex-col items-center justify-center gap-2 py-16 text-center">
                  <span className="text-3xl">🔍</span>
                  <p className="text-sm text-gray-500">No users found</p>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        {clerkUser && (
          <div className="shrink-0 px-4 py-3 border-t border-gray-200 bg-gray-50 flex items-center gap-3">
            <div className="relative">
              <UserButton afterSignOutUrl="/" />
              <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-green-500 border-2 border-white" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold truncate text-gray-800">
                {clerkUser.fullName ?? clerkUser.username ?? "You"}
              </p>
              <p className="text-xs text-green-600">Active now</p>
            </div>
            <button className="w-7 h-7 rounded-lg bg-gray-200 text-gray-500 hover:bg-gray-300 flex items-center justify-center">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="3" />
                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
              </svg>
            </button>

            c
<button
  onClick={() => {
    if (confirm("This will create dummy conversations. Continue?")) {
      seed()
        .then((result) => {
          console.log("Seed result:", result);
          alert("Dummy data created! Refresh the page.");
        })
        .catch((err) => {
          console.error("Seed failed:", err);
          alert("Seed failed – check console.");
        });
    }
  }}
  className="w-full mt-2 py-2 bg-purple-600 text-white rounded-lg text-sm"
>
  🌱 Seed Dummy Data
</button>
          </div>
        )}
      </div>
    </>
  );
}