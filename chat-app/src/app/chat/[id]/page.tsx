"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { Id } from "../../../../convex/_generated/dataModel";
import { useState, useEffect, useRef, useCallback } from "react";
import * as React from "react";

// ─── Constants ────────────────────────────────────────────────────────────────

const EMOJI_LIST = ["❤️", "😂", "😮", "😢", "👏", "🔥", "👍", "🎉", "💯", "😍", "🥺", "😭"];

const PALETTE: [string, string][] = [
  ["#f97316", "#ea580c"],
  ["#8b5cf6", "#7c3aed"],
  ["#06b6d4", "#0891b2"],
  ["#ec4899", "#db2777"],
  ["#10b981", "#059669"],
  ["#f59e0b", "#d97706"],
  ["#3b82f6", "#2563eb"],
  ["#ef4444", "#dc2626"],
];

function getGradient(name: string): [string, string] {
  return PALETTE[name.charCodeAt(0) % PALETTE.length];
}

function getInitials(name: string) {
  return name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();
}

function formatTime(ts: number) {
  return new Date(ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function formatDateLabel(ts: number) {
  const d = new Date(ts);
  const today = new Date();
  const yest = new Date();
  yest.setDate(today.getDate() - 1);
  if (d.toDateString() === today.toDateString()) return "Today";
  if (d.toDateString() === yest.toDateString()) return "Yesterday";
  return d.toLocaleDateString([], { weekday: "long", month: "long", day: "numeric" });
}

// ─── Avatar ───────────────────────────────────────────────────────────────────

function Avatar({ name, size = 36, online }: { name: string; size?: number; online?: boolean }) {
  const [c1, c2] = getGradient(name);
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <div
        className="rounded-full flex items-center justify-center text-white font-bold select-none"
        style={{
          width: size, height: size,
          background: `linear-gradient(135deg, ${c1}, ${c2})`,
          fontSize: size * 0.36,
          boxShadow: `0 2px 8px ${c1}44`,
        }}
      >
        {getInitials(name)}
      </div>
      {online !== undefined && (
        <span
          className="absolute bottom-0 right-0 rounded-full border-2"
          style={{
            width: size * 0.3, height: size * 0.3,
            borderColor: "#f8f6ff",
            background: online ? "#22c55e" : "#d1d5db",
          }}
        />
      )}
    </div>
  );
}

// ─── File Message ─────────────────────────────────────────────────────────────

function FileMessage({
  storageId, fileName, type, isMine,
}: {
  storageId: Id<"_storage">; fileName: string; type: "image" | "file"; isMine: boolean;
}) {
  const fileUrl = useQuery(api.messages.getFileUrl, { storageId });

  if (fileUrl === undefined)
    return (
      <div className="flex items-center gap-2 py-1 text-xs opacity-50">
        <div className="w-3 h-3 rounded-full border-2 border-current animate-spin" style={{ borderTopColor: "transparent" }} />
        Loading…
      </div>
    );
  if (!fileUrl) return <span className="text-xs opacity-40 italic">Unavailable</span>;

  if (type === "image")
    return <img src={fileUrl} alt={fileName} className="rounded-2xl object-cover shadow" style={{ maxWidth: 240, maxHeight: 280 }} />;

  return (
    <a
      href={fileUrl} target="_blank" rel="noopener noreferrer"
      className="flex items-center gap-2 rounded-xl px-3 py-2 no-underline"
      style={{
        background: isMine ? "rgba(255,255,255,0.18)" : "rgba(139,92,246,0.07)",
        border: isMine ? "1px solid rgba(255,255,255,0.25)" : "1px solid rgba(139,92,246,0.15)",
        color: isMine ? "white" : "#6d28d9",
      }}
    >
      <span className="text-lg">📎</span>
      <span className="text-sm font-medium truncate max-w-[180px]">{fileName}</span>
    </a>
  );
}

// ─── Floating Emoji Picker (hover reactions / long press) ─────────────────────

function FloatingEmojiPicker({
  onSelect, onClose, alignRight,
}: {
  onSelect: (e: string) => void; onClose: () => void; alignRight: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) onClose(); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [onClose]);

  return (
    <div
      ref={ref}
      className="absolute bottom-full mb-2 flex items-center gap-0.5 px-2 py-2 rounded-2xl z-50"
      style={{
        background: "white",
        border: "1px solid rgba(139,92,246,0.15)",
        boxShadow: "0 12px 40px rgba(139,92,246,0.18), 0 2px 8px rgba(0,0,0,0.08)",
        [alignRight ? "right" : "left"]: 0,
        whiteSpace: "nowrap",
      }}
    >
      {EMOJI_LIST.slice(0, 8).map((emoji) => (
        <button
          key={emoji}
          onClick={() => { onSelect(emoji); onClose(); }}
          className="text-xl rounded-xl px-1 py-0.5 transition-all hover:scale-125 hover:bg-purple-50"
        >
          {emoji}
        </button>
      ))}
    </div>
  );
}

// ─── Input Emoji Panel ────────────────────────────────────────────────────────

function InputEmojiPanel({ onSelect, onClose }: { onSelect: (e: string) => void; onClose: () => void }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) onClose(); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [onClose]);

  return (
    <div
      ref={ref}
      className="absolute bottom-full mb-3 right-0 rounded-3xl p-4 z-50"
      style={{
        background: "white",
        border: "1px solid rgba(139,92,246,0.12)",
        boxShadow: "0 16px 48px rgba(139,92,246,0.16), 0 4px 16px rgba(0,0,0,0.08)",
        width: 300,
      }}
    >
      <p className="text-[10px] font-bold uppercase tracking-wider mb-2.5 px-0.5" style={{ color: "#9ca3af" }}>
        Pick an emoji
      </p>
      <div className="flex flex-wrap gap-1.5">
        {EMOJI_LIST.map((emoji) => (
          <button
            key={emoji}
            onClick={() => { onSelect(emoji); onClose(); }}
            className="text-2xl rounded-xl p-1.5 transition-all hover:scale-125 hover:bg-purple-50"
          >
            {emoji}
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── Message Bubble ───────────────────────────────────────────────────────────

function MessageBubble({
  msg, isMine, senderName, isGroup, onReact, onDelete, onSelect,
}: {
  msg: any; isMine: boolean; senderName: string; isGroup: boolean;
  onReact: (id: Id<"messages">, emoji: string) => void;
  onDelete: (id: Id<"messages">) => void;
  onSelect: (id: Id<"messages"> | null) => void;
}) {
  const [hovered, setHovered] = useState(false);
  const [showPicker, setShowPicker] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const longPressTimer = useRef<NodeJS.Timeout | null>(null);
  const [longPressed, setLongPressed] = useState(false);

  const reactions = Object.entries(msg.reactions || {}).filter(([, u]: any) => u.length > 0);
  const isDeleted = !!msg.deleted;

  const handleTouchStart = (e: React.TouchEvent) => {
    e.preventDefault();
    longPressTimer.current = setTimeout(() => {
      setLongPressed(true);
      setShowPicker(true);
    }, 500);
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
    if (!longPressed) {
      // short tap: select
    } else {
      setLongPressed(false);
    }
  };

  const handleTouchMove = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
    setLongPressed(false);
  };

  const handleClick = (e: React.MouseEvent) => {
    if (longPressed) {
      e.preventDefault();
      e.stopPropagation();
      setLongPressed(false);
      return;
    }
    onSelect(msg._id);
  };

  const handleReact = (emoji: string) => {
    onReact(msg._id, emoji);
    setShowPicker(false);
  };

  return (
    <div
      className={`flex w-full px-4 mb-0.5 ${isMine ? "justify-end" : "justify-start"}`}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => { setHovered(false); setShowPicker(false); setShowDeleteConfirm(false); }}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onTouchMove={handleTouchMove}
      onClick={handleClick}
    >
      {!isMine && (
        <div className="mr-2 mt-auto mb-1 shrink-0">
          <Avatar name={senderName} size={30} />
        </div>
      )}

      <div className={`relative flex flex-col ${isMine ? "items-end" : "items-start"} max-w-[65%]`}>
        {!isMine && isGroup && (
          <span
            className="text-[11px] font-bold mb-1 px-1"
            style={{ color: getGradient(senderName)[0] }}
          >
            {senderName}
          </span>
        )}

        <div
          style={{
            padding: "10px 16px",
            borderRadius: isMine ? "20px 20px 5px 20px" : "20px 20px 20px 5px",
            background: isDeleted
              ? "rgba(0,0,0,0.04)"
              : isMine
              ? "linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%)"
              : "white",
            color: isDeleted ? "#9ca3af" : isMine ? "white" : "#1f2937",
            boxShadow: isMine
              ? "0 4px 18px rgba(109,40,217,0.28)"
              : "0 2px 12px rgba(0,0,0,0.07)",
            border: isDeleted
              ? "1.5px dashed #e5e7eb"
              : isMine
              ? "none"
              : "1px solid rgba(139,92,246,0.08)",
            fontSize: 14,
            lineHeight: 1.5,
            wordBreak: "break-word" as any,
          }}
        >
          {isDeleted ? (
            <span className="italic opacity-60 flex items-center gap-1.5">🚫 Message deleted</span>
          ) : msg.type === "text" ? (
            msg.content
          ) : msg.fileId ? (
            <FileMessage
              storageId={msg.fileId}
              fileName={msg.fileName || "File"}
              type={msg.type as "image" | "file"}
              isMine={isMine}
            />
          ) : null}
        </div>

        {reactions.length > 0 && (
          <div className={`flex flex-wrap gap-1 mt-1.5 ${isMine ? "justify-end" : "justify-start"}`}>
            {reactions.map(([emoji, users]: any) => (
              <button
                key={emoji}
                onClick={(e) => { e.stopPropagation(); onReact(msg._id, emoji); }}
                className="flex items-center gap-0.5 rounded-full px-2 py-0.5 text-xs transition-all hover:scale-105 active:scale-95"
                style={{
                  background: "white",
                  border: "1.5px solid rgba(139,92,246,0.18)",
                  boxShadow: "0 1px 4px rgba(139,92,246,0.1)",
                  color: "#374151",
                }}
              >
                <span>{emoji}</span>
                <span className="font-bold ml-0.5" style={{ color: "#7c3aed" }}>{users.length}</span>
              </button>
            ))}
          </div>
        )}

        <div
          className={`flex items-center gap-1.5 mt-0.5 px-0.5 ${isMine ? "flex-row-reverse" : ""}`}
        >
          <span className="text-[10px]" style={{ color: "#b0b7c3" }}>{formatTime(msg.createdAt)}</span>
          {isMine && (
            <span style={{ color: (msg.seenBy?.length ?? 0) > 0 ? "#8b5cf6" : "#d1d5db", fontSize: 12 }}>
              ✓✓
            </span>
          )}
        </div>

        {(hovered || showPicker) && !isDeleted && (
          <div
            className={`absolute -top-10 flex items-center gap-1 z-40 ${isMine ? "right-0" : "left-0"}`}
          >
            {showPicker ? (
              <FloatingEmojiPicker
                onSelect={handleReact}
                onClose={() => setShowPicker(false)}
                alignRight={isMine}
              />
            ) : (
              <>
                <button
                  onClick={(e) => { e.stopPropagation(); setShowPicker(true); }}
                  className="rounded-full px-2.5 py-1.5 text-sm shadow-md transition-all hover:scale-105 active:scale-95"
                  style={{
                    background: "white",
                    border: "1px solid rgba(139,92,246,0.15)",
                    boxShadow: "0 4px 12px rgba(139,92,246,0.12)",
                  }}
                  title="React"
                >
                  😊
                </button>
                {isMine && (
                  <button
                    onClick={(e) => { e.stopPropagation(); setShowDeleteConfirm(true); }}
                    className="rounded-full px-2.5 py-1.5 text-xs font-semibold shadow-md transition-all hover:scale-105 active:scale-95"
                    style={{
                      background: "white",
                      border: "1px solid #fecaca",
                      color: "#ef4444",
                      boxShadow: "0 4px 12px rgba(239,68,68,0.1)",
                    }}
                    title="Delete"
                  >
                    🗑
                  </button>
                )}
              </>
            )}
          </div>
        )}

        {showDeleteConfirm && (
          <div
            className={`absolute -top-[88px] z-50 rounded-2xl px-4 py-3 flex flex-col gap-2.5 ${isMine ? "right-0" : "left-0"}`}
            style={{
              background: "white",
              border: "1px solid #fecaca",
              boxShadow: "0 12px 32px rgba(239,68,68,0.14)",
              minWidth: 168,
            }}
          >
            <span className="text-sm font-bold" style={{ color: "#1f2937" }}>Delete message?</span>
            <div className="flex gap-1.5">
              <button
                onClick={(e) => { e.stopPropagation(); onDelete(msg._id); setShowDeleteConfirm(false); }}
                className="flex-1 rounded-xl py-1.5 text-xs font-bold text-white transition"
                style={{ background: "linear-gradient(135deg, #ef4444, #dc2626)" }}
              >
                Delete
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); setShowDeleteConfirm(false); }}
                className="flex-1 rounded-xl py-1.5 text-xs font-semibold transition"
                style={{ background: "#f9fafb", color: "#6b7280", border: "1px solid #e5e7eb" }}
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>

      {isMine && <div className="w-2 shrink-0" />}
    </div>
  );
}

// ─── Date Divider ─────────────────────────────────────────────────────────────

function DateDivider({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-3 my-4 px-6">
      <div className="flex-1 h-px" style={{ background: "rgba(139,92,246,0.1)" }} />
      <span
        className="text-[11px] font-semibold px-3 py-1 rounded-full shrink-0"
        style={{ background: "rgba(139,92,246,0.07)", color: "#8b5cf6", border: "1px solid rgba(139,92,246,0.12)" }}
      >
        {label}
      </span>
      <div className="flex-1 h-px" style={{ background: "rgba(139,92,246,0.1)" }} />
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function ChatPage({ params }: { params: Promise<{ id: string }> }) {
  const unwrappedParams = React.use(params);
  const conversationId = unwrappedParams.id as Id<"conversations">;

  const messages = useQuery(api.messages.getMessages, conversationId ? { conversationId } : "skip");
  const currentUser = useQuery(api.users.getCurrentUser);
  const allUsers = useQuery(api.users.getAllUsers);
  const conversation = useQuery(api.conversations.getConversation, conversationId ? { conversationId } : "skip");
  const typingUsers = useQuery(api.typing.getTyping, conversationId ? { conversationId } : "skip");

  const sendMessage = useMutation(api.messages.sendMessage);
  const deleteMessage = useMutation(api.messages.deleteMessage);
  const toggleReaction = useMutation(api.messages.toggleReaction);
  const markSeen = useMutation(api.messages.markSeen);
  const generateUploadUrl = useMutation(api.messages.generateUploadUrl);
  const sendFileMessage = useMutation(api.messages.sendFileMessage);
  const clearUnread = useMutation(api.unreads.clearUnread);
  const setTyping = useMutation(api.typing.setTyping);

  const [text, setText] = useState("");
  const [uploading, setUploading] = useState(false);
  const [showInputEmoji, setShowInputEmoji] = useState(false);
  const [selectedMessageId, setSelectedMessageId] = useState<Id<"messages"> | null>(null);

  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Mark messages as seen and clear unread
  useEffect(() => {
    if (!conversationId) return;
    markSeen({ conversationId });
    clearUnread({ conversationId });
  }, [messages, conversationId, markSeen, clearUnread]);

  // Scroll to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Handle typing indicator
  useEffect(() => {
    if (!conversationId || !currentUser) return;

    const handleTyping = () => {
      setTyping({ conversationId, isTyping: true });
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = setTimeout(() => {
        setTyping({ conversationId, isTyping: false });
      }, 3000);
    };

    const input = inputRef.current;
    if (input) {
      input.addEventListener("input", handleTyping);
      return () => {
        input.removeEventListener("input", handleTyping);
        if (typingTimeoutRef.current) {
          clearTimeout(typingTimeoutRef.current);
          setTyping({ conversationId, isTyping: false });
        }
      };
    }
  }, [conversationId, currentUser, setTyping]);

  // Header info
  const headerInfo = React.useMemo(() => {
    if (!conversation || !allUsers || !currentUser)
      return { name: "Conversation", online: false, isGroup: false, memberCount: 0, otherUser: null };

    if (conversation.isGroup) {
      return { name: conversation.name ?? "Group Chat", online: false, isGroup: true, memberCount: conversation.members?.length ?? 0, otherUser: null };
    }

    const otherId = conversation.members?.find((id: string) => {
      const u = allUsers.find((u) => u._id === id);
      return u && u._id !== currentUser._id;
    });
    const otherUser = otherId ? allUsers.find((u) => u._id === otherId) : null;
    const online = otherUser ? Date.now() - (otherUser.lastSeen ?? 0) < 30000 : false;
    return { name: otherUser?.name ?? "Direct Message", online, isGroup: false, memberCount: 0, otherUser };
  }, [conversation, allUsers, currentUser]);

  const userMap = React.useMemo(
    () => Object.fromEntries((allUsers ?? []).map((u) => [u._id, u])),
    [allUsers]
  );

  const getSenderName = (msg: any): string => userMap[msg.senderId]?.name ?? "Unknown";
  const isMine = (msg: any): boolean => !!currentUser && msg.senderId === currentUser._id;

  const grouped = React.useMemo(() => {
    if (!messages) return [];
    const items: any[] = [];
    let lastDate = "";
    for (const msg of messages) {
      const ds = new Date(msg.createdAt).toDateString();
      if (ds !== lastDate) { items.push({ type: "divider", label: formatDateLabel(msg.createdAt) }); lastDate = ds; }
      items.push({ type: "msg", msg });
    }
    return items;
  }, [messages]);

  const handleSend = useCallback(async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!text.trim() || uploading) return;
    const content = text.trim();
    setText("");
    // Stop typing
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
      setTyping({ conversationId, isTyping: false });
    }
    await sendMessage({ conversationId, content });
    inputRef.current?.focus();
  }, [text, uploading, conversationId, sendMessage, setTyping]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { alert("File too large (max 5MB)"); e.target.value = ""; return; }
    setUploading(true);
    try {
      const uploadUrl = await generateUploadUrl();
      const res = await fetch(uploadUrl, { method: "POST", headers: { "Content-Type": file.type }, body: file });
      const { storageId } = await res.json();
      await sendFileMessage({ conversationId, fileId: storageId, fileName: file.name, type: file.type.startsWith("image") ? "image" : "file" });
    } catch { alert("Upload failed."); }
    finally { setUploading(false); if (fileInputRef.current) fileInputRef.current.value = ""; }
  };

  if (!conversationId)
    return <div className="flex-1 flex items-center justify-center" style={{ background: "#f8f6ff", color: "#9ca3af" }}>Loading…</div>;

  // Determine typing indicator text
  const typingText = typingUsers && typingUsers.length > 0
    ? typingUsers.length === 1
      ? `${typingUsers[0].name} is typing...`
      : `${typingUsers.length} people are typing...`
    : null;

  return (
    <div
      className="flex flex-col h-screen flex-1 relative"
      style={{ background: "linear-gradient(160deg, #faf8ff 0%, #f3f0ff 50%, #fdf4ff 100%)", fontFamily: "'Sora','DM Sans','Segoe UI',sans-serif" }}
    >
      {/* Ambient blobs */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden" style={{ zIndex: 0 }}>
        <div className="absolute rounded-full opacity-[0.18]" style={{ width: 500, height: 500, top: -150, right: -150, background: "radial-gradient(circle, #c4b5fd, transparent 65%)", filter: "blur(50px)" }} />
        <div className="absolute rounded-full opacity-[0.12]" style={{ width: 380, height: 380, bottom: 80, left: -100, background: "radial-gradient(circle, #a5b4fc, transparent 65%)", filter: "blur(60px)" }} />
        <div className="absolute rounded-full opacity-[0.1]" style={{ width: 250, height: 250, top: "40%", left: "40%", background: "radial-gradient(circle, #f9a8d4, transparent 65%)", filter: "blur(60px)" }} />
      </div>

      {/* ── HEADER ── */}
      <div
        className="shrink-0 flex items-center gap-3 px-5 py-3 relative z-10"
        style={{
          background: "rgba(255,255,255,0.72)",
          backdropFilter: "blur(24px)",
          borderBottom: "1px solid rgba(139,92,246,0.1)",
          boxShadow: "0 4px 20px rgba(139,92,246,0.07)",
        }}
      >
        <button
          className="w-9 h-9 rounded-xl flex items-center justify-center transition shrink-0"
          style={{ background: "rgba(139,92,246,0.07)", color: "#7c3aed" }}
          onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(139,92,246,0.14)")}
          onMouseLeave={(e) => (e.currentTarget.style.background = "rgba(139,92,246,0.07)")}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </button>

        {headerInfo.isGroup ? (
          <div className="w-11 h-11 rounded-full flex items-center justify-center text-2xl shrink-0" style={{ background: "linear-gradient(135deg,#8b5cf6,#6d28d9)", boxShadow: "0 3px 12px rgba(109,40,217,0.35)" }}>
            👥
          </div>
        ) : (
          <Avatar name={headerInfo.name} size={42} online={headerInfo.online} />
        )}

        <div className="flex flex-col flex-1 min-w-0">
          <span className="font-extrabold text-base leading-tight truncate" style={{ color: "#111827", letterSpacing: "-0.02em" }}>
            {headerInfo.name}
          </span>
          <span className="text-[11px] font-medium flex items-center gap-1" style={{ color: headerInfo.online ? "#22c55e" : "#9ca3af" }}>
            {headerInfo.isGroup ? (
              `${headerInfo.memberCount} members`
            ) : headerInfo.online ? (
              <><span className="w-1.5 h-1.5 rounded-full bg-green-400 inline-block" style={{ boxShadow: "0 0 5px #22c55e" }} />Active now</>
            ) : (
              "Offline"
            )}
          </span>
          {/* Typing indicator */}
          {typingText && (
            <span className="text-xs text-purple-600 animate-pulse mt-0.5">{typingText}</span>
          )}
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {[
            <svg key="ph" width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.15 12a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.06 1h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.09 8.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 21 16z" /></svg>,
            <svg key="vid" width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><polygon points="23 7 16 12 23 17 23 7" /><rect x="1" y="5" width="15" height="14" rx="2" /></svg>,
            <svg key="info" width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><line x1="12" y1="16" x2="12" y2="12" /><line x1="12" y1="8" x2="12.01" y2="8" /></svg>,
          ].map((icon, i) => (
            <button key={i} className="w-9 h-9 rounded-xl flex items-center justify-center transition" style={{ background: "rgba(139,92,246,0.07)", color: "#8b5cf6" }}
              onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(139,92,246,0.14)")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "rgba(139,92,246,0.07)")}
            >
              {icon}
            </button>
          ))}
        </div>
      </div>

      {/* ── MESSAGES ── */}
      <div className="flex-1 overflow-y-auto py-4 relative z-10" style={{ scrollbarWidth: "none" }}>
        {!messages ? (
          <div className="flex items-center justify-center h-full gap-3" style={{ color: "#9ca3af" }}>
            <div className="w-6 h-6 rounded-full border-4 animate-spin" style={{ borderColor: "rgba(139,92,246,0.2)", borderTopColor: "#8b5cf6" }} />
            Loading messages…
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-4">
            <div className="w-20 h-20 rounded-3xl flex items-center justify-center text-4xl" style={{ background: "rgba(139,92,246,0.08)", boxShadow: "0 8px 32px rgba(139,92,246,0.12)" }}>
              💬
            </div>
            <div className="text-center">
              <p className="font-extrabold text-lg" style={{ color: "#1f2937", letterSpacing: "-0.02em" }}>Say hello!</p>
              <p className="text-sm mt-1" style={{ color: "#9ca3af" }}>Start your conversation with {headerInfo.name}</p>
            </div>
          </div>
        ) : (
          grouped.map((item, i) =>
            item.type === "divider" ? (
              <DateDivider key={`d-${i}`} label={item.label} />
            ) : (
              <MessageBubble
                key={item.msg._id}
                msg={item.msg}
                isMine={isMine(item.msg)}
                senderName={getSenderName(item.msg)}
                isGroup={headerInfo.isGroup}
                onReact={(id, emoji) => toggleReaction({ messageId: id, emoji })}
                onDelete={(id) => deleteMessage({ messageId: id })}
                onSelect={(id) => setSelectedMessageId(id)}
              />
            )
          )
        )}
        <div ref={bottomRef} />
      </div>

      {/* ── INPUT BAR ── */}
      <div
        className="shrink-0 px-4 py-3 relative z-10"
        style={{
          background: "rgba(255,255,255,0.78)",
          backdropFilter: "blur(24px)",
          borderTop: "1px solid rgba(139,92,246,0.08)",
        }}
      >
        {uploading && (
          <div className="flex items-center gap-2 mb-2 px-1">
            <div className="w-3.5 h-3.5 rounded-full border-2 animate-spin" style={{ borderColor: "rgba(139,92,246,0.2)", borderTopColor: "#8b5cf6" }} />
            <span className="text-xs font-semibold" style={{ color: "#8b5cf6" }}>Uploading file…</span>
          </div>
        )}

        <form onSubmit={handleSend} className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="w-10 h-10 rounded-xl flex items-center justify-center transition shrink-0"
            style={{ background: "rgba(139,92,246,0.08)", color: "#8b5cf6" }}
            onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(139,92,246,0.15)")}
            onMouseLeave={(e) => (e.currentTarget.style.background = "rgba(139,92,246,0.08)")}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" />
            </svg>
          </button>
          <input ref={fileInputRef} type="file" onChange={handleFileChange} className="hidden" disabled={uploading} />

          <div
            className="flex-1 flex items-center gap-2 rounded-2xl px-4 py-2.5 relative"
            style={{
              background: "white",
              border: "1.5px solid rgba(139,92,246,0.14)",
              boxShadow: "0 2px 10px rgba(139,92,246,0.07)",
            }}
          >
            <input
              ref={inputRef}
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
              placeholder={`Message ${headerInfo.name}…`}
              className="flex-1 bg-transparent outline-none text-sm"
              style={{ color: "#1f2937" }}
              disabled={uploading}
            />

            <div className="relative shrink-0">
              <button
                type="button"
                onClick={() => setShowInputEmoji((v) => !v)}
                className="text-xl transition-transform hover:scale-110 active:scale-95"
              >
                🙂
              </button>
              {showInputEmoji && (
                <InputEmojiPanel
                  onSelect={(e) => { setText((t) => t + e); setShowInputEmoji(false); inputRef.current?.focus(); }}
                  onClose={() => setShowInputEmoji(false)}
                />
              )}
            </div>
          </div>

          <button
            type="submit"
            disabled={!text.trim() || uploading}
            className="w-11 h-11 rounded-2xl flex items-center justify-center transition-all shrink-0"
            style={{
              background: text.trim() && !uploading
                ? "linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%)"
                : "rgba(139,92,246,0.09)",
              color: text.trim() && !uploading ? "white" : "#c4b5fd",
              boxShadow: text.trim() && !uploading ? "0 6px 18px rgba(109,40,217,0.35)" : "none",
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="22" y1="2" x2="11" y2="13" />
              <polygon points="22 2 15 22 11 13 2 9 22 2" />
            </svg>
          </button>
        </form>
      </div>
    </div>
  );
}