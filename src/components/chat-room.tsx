"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { upload } from "@vercel/blob/client";
import { Bi } from "@/components/bi";
import { cn } from "@/lib/utils";
import { useLang } from "@/lib/use-lang";

type Message = {
  id: string;
  body: string | null;
  attachmentUrl: string | null;
  deleted: boolean;
  createdAt: string;
  senderId: string;
  senderName: string;
};

type Member = {
  id: string;
  name: string;
};

type GroupSummary = { id: string; name: string };

const POLL_MS = 4000;
const RECALL_WINDOW_MS = 5 * 60 * 1000;
const LONG_PRESS_MS = 450;
const EMOJIS = ["😀", "😂", "😍", "👍", "🙏", "🎉", "😢", "😡", "❤️", "🔥", "👏", "🤔", "😅", "🙌", "💯", "✅"];

/** Renders @Name mentions in bold — matched against the group's member names. */
function MessageBody({ body, memberNames }: { body: string; memberNames: string[] }) {
  if (memberNames.length === 0) return <>{body}</>;
  const pattern = new RegExp(`(@(?:${memberNames.map((n) => n.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|")}))`, "g");
  const parts = body.split(pattern);
  return (
    <>
      {parts.map((part, i) =>
        part.startsWith("@") && memberNames.includes(part.slice(1)) ? (
          <strong key={i} className="font-semibold">
            {part}
          </strong>
        ) : (
          part
        ),
      )}
    </>
  );
}

export function ChatRoom({
  groupId,
  currentUserId,
  isGroupAdmin,
  initialMessages,
  members,
}: {
  groupId: string;
  currentUserId: string;
  isGroupAdmin: boolean;
  initialMessages: Message[];
  members: Member[];
}) {
  const lang = useLang();
  const t = (zh: string, en: string) => (lang === "en" ? en : zh);
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [onlineCount, setOnlineCount] = useState<number | null>(null);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [showEmoji, setShowEmoji] = useState(false);
  const [mentionQuery, setMentionQuery] = useState<string | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [forwardOpen, setForwardOpen] = useState(false);
  const [forwardTargets, setForwardTargets] = useState<GroupSummary[] | null>(null);
  const [copiedFlash, setCopiedFlash] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const longPressFired = useRef(false);

  const selectionMode = selectedIds.size > 0;

  const memberNames = useMemo(() => members.map((m) => m.name), [members]);
  const otherMembers = useMemo(
    () => members.filter((m) => m.id !== currentUserId),
    [members, currentUserId],
  );
  const mentionMatches = useMemo(() => {
    if (mentionQuery === null) return [];
    const q = mentionQuery.toLowerCase();
    return otherMembers.filter((m) => m.name.toLowerCase().includes(q));
  }, [mentionQuery, otherMembers]);

  // Which messages the current user is allowed to delete — own within the
  // recall window, or anything at all if they're the group admin.
  const deletableIds = useMemo(() => {
    const set = new Set<string>();
    for (const m of messages) {
      if (m.deleted) continue;
      const mine = m.senderId === currentUserId;
      if (isGroupAdmin || (mine && now - new Date(m.createdAt).getTime() < RECALL_WINDOW_MS)) {
        set.add(m.id);
      }
    }
    return set;
  }, [messages, now, isGroupAdmin, currentUserId]);
  const canDeleteSelection = selectionMode && Array.from(selectedIds).every((id) => deletableIds.has(id));

  useEffect(() => {
    const poll = async () => {
      const res = await fetch(`/api/chat/groups/${groupId}/messages`);
      if (!res.ok) return;
      const data = await res.json();
      setMessages(data.messages);
      if (typeof data.onlineCount === "number") setOnlineCount(data.onlineCount);
    };
    poll();
    const interval = setInterval(poll, POLL_MS);
    return () => clearInterval(interval);
  }, [groupId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 15000);
    return () => clearInterval(interval);
  }, []);

  const send = async () => {
    const body = draft.trim();
    if (!body || sending) return;
    setSending(true);
    setDraft("");
    setMentionQuery(null);
    const res = await fetch(`/api/chat/groups/${groupId}/messages`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ body }),
    });
    if (res.ok) {
      const data = await res.json();
      // Append immediately instead of waiting on a second GET round-trip —
      // own messages never render senderName, so the placeholder is fine
      // until the next poll fills in the rest.
      setMessages((prev) => [
        ...prev,
        {
          id: data.message.id,
          body: data.message.body,
          attachmentUrl: data.message.attachmentUrl ?? null,
          deleted: false,
          createdAt: data.message.createdAt,
          senderId: data.message.senderId,
          senderName: "",
        },
      ]);
    }
    setSending(false);
  };

  const sendPhoto = async (file: File) => {
    setUploadingPhoto(true);
    try {
      const blob = await upload(`chat/${groupId}/${Date.now()}-${file.name}`, file, {
        access: "private",
        handleUploadUrl: `/api/chat/groups/${groupId}/photo-upload`,
      });
      const res = await fetch(`/api/chat/groups/${groupId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ attachmentUrl: blob.url }),
      });
      if (res.ok) {
        const data = await res.json();
        setMessages((prev) => [
          ...prev,
          {
            id: data.message.id,
            body: data.message.body,
            attachmentUrl: data.message.attachmentUrl ?? null,
            deleted: false,
            createdAt: data.message.createdAt,
            senderId: data.message.senderId,
            senderName: "",
          },
        ]);
      }
    } finally {
      setUploadingPhoto(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const clearSelection = () => setSelectedIds(new Set());

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const startLongPress = (id: string) => {
    longPressFired.current = false;
    cancelLongPress();
    longPressTimer.current = setTimeout(() => {
      longPressFired.current = true;
      setSelectedIds((prev) => new Set(prev).add(id));
    }, LONG_PRESS_MS);
  };

  const cancelLongPress = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  };

  const onBubblePointerUp = (id: string) => {
    cancelLongPress();
    if (longPressFired.current) return; // long-press already started selection
    if (selectionMode) toggleSelect(id);
  };

  const deleteSelected = async () => {
    if (!canDeleteSelection) return;
    const ids = Array.from(selectedIds);
    await Promise.all(ids.map((id) => fetch(`/api/chat/groups/${groupId}/messages/${id}`, { method: "DELETE" })));
    setMessages((prev) =>
      prev.map((m) => (selectedIds.has(m.id) ? { ...m, body: null, attachmentUrl: null, deleted: true } : m)),
    );
    clearSelection();
  };

  const copySelected = async () => {
    const ordered = messages.filter((m) => selectedIds.has(m.id) && !m.deleted);
    const text = ordered
      .map((m) => m.body || (m.attachmentUrl ? "[photo]" : ""))
      .filter(Boolean)
      .join("\n");
    if (text && navigator.clipboard) {
      try {
        await navigator.clipboard.writeText(text);
        setCopiedFlash(true);
        setTimeout(() => setCopiedFlash(false), 1200);
      } catch {
        // clipboard access denied — nothing more we can do here
      }
    }
  };

  const openForward = async () => {
    setForwardOpen(true);
    if (!forwardTargets) {
      const res = await fetch("/api/chat/groups");
      if (res.ok) {
        const data = await res.json();
        setForwardTargets(
          (data.groups ?? []).filter((g: GroupSummary) => g.id !== groupId).map((g: GroupSummary) => ({ id: g.id, name: g.name })),
        );
      }
    }
  };

  const forwardTo = async (targetGroupId: string) => {
    const ordered = messages.filter((m) => selectedIds.has(m.id) && !m.deleted);
    for (const m of ordered) {
      await fetch(`/api/chat/groups/${targetGroupId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          m.attachmentUrl ? { attachmentUrl: m.attachmentUrl, body: m.body || undefined } : { body: m.body },
        ),
      });
    }
    setForwardOpen(false);
    clearSelection();
  };

  const onDraftChange = (value: string) => {
    setDraft(value);
    const cursor = textareaRef.current?.selectionStart ?? value.length;
    const upToCursor = value.slice(0, cursor);
    const match = upToCursor.match(/@([^\s@]*)$/);
    setMentionQuery(match ? match[1] : null);
  };

  const insertMention = (name: string) => {
    const cursor = textareaRef.current?.selectionStart ?? draft.length;
    const upToCursor = draft.slice(0, cursor);
    const afterCursor = draft.slice(cursor);
    const replaced = upToCursor.replace(/@([^\s@]*)$/, `@${name} `);
    setDraft(replaced + afterCursor);
    setMentionQuery(null);
    textareaRef.current?.focus();
  };

  const insertEmoji = (emoji: string) => {
    const cursor = textareaRef.current?.selectionStart ?? draft.length;
    setDraft(draft.slice(0, cursor) + emoji + draft.slice(cursor));
    setShowEmoji(false);
    textareaRef.current?.focus();
  };

  return (
    <div className="flex flex-1 flex-col overflow-hidden rounded-lg border border-neutral-200">
      <div className="flex items-center justify-between border-b border-neutral-200 px-3 py-1.5 text-xs text-neutral-500">
        {selectionMode ? (
          <>
            <button type="button" onClick={clearSelection} className="text-base leading-none text-neutral-600">
              ×
            </button>
            <span className="font-medium text-neutral-700">
              {copiedFlash ? <Bi zh="已复制" en="Copied" /> : <>{selectedIds.size} <Bi zh="已选" en="selected" /></>}
            </span>
            <div className="flex items-center gap-3 text-base">
              <button type="button" onClick={copySelected} title={t("复制", "Copy")} aria-label={t("复制", "Copy")}>
                📋
              </button>
              <button type="button" onClick={openForward} title={t("转发", "Forward")} aria-label={t("转发", "Forward")}>
                ➡️
              </button>
              <button
                type="button"
                onClick={deleteSelected}
                disabled={!canDeleteSelection}
                title={t("删除", "Delete")}
                aria-label={t("删除", "Delete")}
                className="disabled:opacity-30"
              >
                🗑
              </button>
            </div>
          </>
        ) : (
          <>
            <span>
              {members.length} <Bi zh="成员" en="members" />
            </span>
            {onlineCount !== null ? (
              <span className="flex items-center gap-1">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                {onlineCount} <Bi zh="在线" en="online" />
              </span>
            ) : null}
          </>
        )}
      </div>
      <div className="flex-1 space-y-3 overflow-y-auto p-4">
        {messages.map((m) => {
          const mine = m.senderId === currentUserId;
          const selected = selectedIds.has(m.id);
          return (
            <div key={m.id} className={mine ? "flex items-center justify-end gap-1.5" : "flex items-center justify-start gap-1.5"}>
              {selectionMode && !mine ? <SelectDot selected={selected} /> : null}
              <div
                onPointerDown={() => startLongPress(m.id)}
                onPointerUp={() => onBubblePointerUp(m.id)}
                onPointerLeave={cancelLongPress}
                onPointerCancel={cancelLongPress}
                onContextMenu={(e) => e.preventDefault()}
                style={{ WebkitTouchCallout: "none" }}
                className={cn(
                  "max-w-[75%] rounded-lg px-3 py-2 text-sm select-none",
                  selected && "ring-2 ring-purple-500",
                  mine ? "bg-purple-700 text-white" : "bg-neutral-100 text-neutral-900",
                )}
              >
                {mine ? null : <p className="mb-0.5 text-xs font-medium text-neutral-500">{m.senderName}</p>}
                {m.deleted ? (
                  <p className="text-sm italic opacity-70">
                    <Bi zh="此消息已删除" en="This message was deleted" />
                  </p>
                ) : (
                  <>
                    {m.attachmentUrl ? (
                      <a
                        href={`/api/chat/groups/${groupId}/photo?url=${encodeURIComponent(m.attachmentUrl)}`}
                        target="_blank"
                        rel="noreferrer"
                        onClick={(e) => selectionMode && e.preventDefault()}
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element -- served through our own proxy */}
                        <img
                          src={`/api/chat/groups/${groupId}/photo?url=${encodeURIComponent(m.attachmentUrl)}`}
                          alt=""
                          className="mb-1 max-h-48 w-full rounded-md object-cover"
                        />
                      </a>
                    ) : null}
                    {m.body ? (
                      <p className="whitespace-pre-wrap break-words">
                        <MessageBody body={m.body} memberNames={memberNames} />
                      </p>
                    ) : null}
                  </>
                )}
                <p className={mine ? "mt-1 text-[10px] text-purple-200" : "mt-1 text-[10px] text-neutral-400"}>
                  {new Date(m.createdAt).toLocaleString("en-MY", { timeZone: "Asia/Kuala_Lumpur" })}
                </p>
              </div>
              {selectionMode && mine ? <SelectDot selected={selected} /> : null}
            </div>
          );
        })}
        {messages.length === 0 ? (
          <p className="text-center text-sm text-neutral-400">
            <Bi zh="还没有消息，说点什么吧" en="No messages yet — say something" />
          </p>
        ) : null}
        <div ref={bottomRef} />
      </div>
      <p className="border-t border-neutral-100 px-3 py-1 text-center text-[10px] text-neutral-400">
        <Bi zh="长按消息可以多选、复制、转发或删除" en="Long-press a message to select, copy, forward or delete" />
      </p>
      <div className="relative border-t border-neutral-200 p-3">
        {mentionQuery !== null && mentionMatches.length > 0 ? (
          <div className="absolute bottom-full left-3 mb-1 max-h-40 w-56 overflow-y-auto rounded-md border border-neutral-200 bg-white shadow-lg">
            {mentionMatches.map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => insertMention(m.name)}
                className="block w-full px-3 py-1.5 text-left text-sm hover:bg-purple-50"
              >
                @{m.name}
              </button>
            ))}
          </div>
        ) : null}
        {showEmoji ? (
          <div className="absolute bottom-full left-3 mb-1 grid w-64 grid-cols-8 gap-1 rounded-md border border-neutral-200 bg-white p-2 shadow-lg">
            {EMOJIS.map((e) => (
              <button
                key={e}
                type="button"
                onClick={() => insertEmoji(e)}
                className="rounded p-1 text-lg hover:bg-neutral-100"
              >
                {e}
              </button>
            ))}
          </div>
        ) : null}
        <div className="flex items-end gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            disabled={uploadingPhoto}
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) sendPhoto(file);
            }}
            className="hidden"
          />
          <button
            type="button"
            disabled={uploadingPhoto}
            onClick={() => fileInputRef.current?.click()}
            title={t("发送照片", "Send photo")}
            aria-label={t("发送照片", "Send photo")}
            className="shrink-0 rounded-md border border-neutral-300 px-2.5 py-2 text-sm hover:bg-neutral-50 disabled:opacity-50"
          >
            {uploadingPhoto ? "…" : "📷"}
          </button>
          <button
            type="button"
            onClick={() => setShowEmoji((v) => !v)}
            title={t("表情", "Emoji")}
            aria-label={t("表情", "Emoji")}
            className="shrink-0 rounded-md border border-neutral-300 px-2.5 py-2 text-sm hover:bg-neutral-50"
          >
            😀
          </button>
          <textarea
            ref={textareaRef}
            value={draft}
            onChange={(e) => onDraftChange(e.target.value)}
            onFocus={() => setShowEmoji(false)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey && mentionQuery === null) {
                e.preventDefault();
                send();
              } else if (e.key === "Escape") {
                setMentionQuery(null);
              }
            }}
            rows={1}
            placeholder={t("输入消息... 输入 @ 可以提及成员", "Type a message... type @ to mention someone")}
            className="flex-1 resize-none rounded-md border border-neutral-300 px-3 py-2 text-sm"
          />
          <button
            type="button"
            onClick={send}
            disabled={sending || !draft.trim()}
            className="shrink-0 rounded-md bg-purple-700 px-4 py-2 text-sm font-medium text-white hover:bg-purple-800 disabled:opacity-50"
          >
            <Bi zh="发送" en="Send" />
          </button>
        </div>
      </div>

      {forwardOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
          <div className="max-h-96 w-72 overflow-hidden rounded-lg bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-neutral-200 px-3 py-2">
              <p className="text-sm font-medium">
                <Bi zh="转发到..." en="Forward to..." />
              </p>
              <button type="button" onClick={() => setForwardOpen(false)} className="text-neutral-500">
                ×
              </button>
            </div>
            <div className="max-h-80 overflow-y-auto">
              {forwardTargets === null ? (
                <p className="p-4 text-center text-sm text-neutral-400">
                  <Bi zh="加载中..." en="Loading..." />
                </p>
              ) : forwardTargets.length === 0 ? (
                <p className="p-4 text-center text-sm text-neutral-400">
                  <Bi zh="没有其他群组" en="No other groups" />
                </p>
              ) : (
                forwardTargets.map((g) => (
                  <button
                    key={g.id}
                    type="button"
                    onClick={() => forwardTo(g.id)}
                    className="block w-full px-3 py-2.5 text-left text-sm hover:bg-purple-50"
                  >
                    {g.name}
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function SelectDot({ selected }: { selected: boolean }) {
  return (
    <span
      className={cn(
        "flex h-5 w-5 shrink-0 items-center justify-center rounded-full border text-[10px]",
        selected ? "border-purple-600 bg-purple-600 text-white" : "border-neutral-300 bg-white text-transparent",
      )}
    >
      ✓
    </span>
  );
}
