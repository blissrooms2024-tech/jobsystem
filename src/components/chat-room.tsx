"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Bi } from "@/components/bi";
import { useLang } from "@/lib/use-lang";

type Message = {
  id: string;
  body: string;
  createdAt: string;
  senderId: string;
  senderName: string;
};

type Member = {
  id: string;
  name: string;
};

const POLL_MS = 4000;

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
  initialMessages,
  members,
}: {
  groupId: string;
  currentUserId: string;
  initialMessages: Message[];
  members: Member[];
}) {
  const lang = useLang();
  const t = (zh: string, en: string) => (lang === "en" ? en : zh);
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [onlineCount, setOnlineCount] = useState<number | null>(null);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [mentionQuery, setMentionQuery] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

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
      setMessages((prev) => [...prev, { ...data.message, senderName: "" }]);
      // Refetch immediately for the correct senderName (and any messages
      // that landed from others while this request was in flight).
      const refreshed = await fetch(`/api/chat/groups/${groupId}/messages`);
      if (refreshed.ok) {
        const refreshedData = await refreshed.json();
        setMessages(refreshedData.messages);
        if (typeof refreshedData.onlineCount === "number") setOnlineCount(refreshedData.onlineCount);
      }
    }
    setSending(false);
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

  return (
    <div className="flex flex-1 flex-col overflow-hidden rounded-lg border border-neutral-200">
      <div className="flex items-center justify-between border-b border-neutral-200 px-3 py-1.5 text-xs text-neutral-500">
        <span>
          {members.length} <Bi zh="成员" en="members" />
        </span>
        {onlineCount !== null ? (
          <span className="flex items-center gap-1">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
            {onlineCount} <Bi zh="在线" en="online" />
          </span>
        ) : null}
      </div>
      <div className="flex-1 space-y-3 overflow-y-auto p-4">
        {messages.map((m) => {
          const mine = m.senderId === currentUserId;
          return (
            <div key={m.id} className={mine ? "flex justify-end" : "flex justify-start"}>
              <div
                className={
                  mine
                    ? "max-w-[75%] rounded-lg bg-purple-700 px-3 py-2 text-sm text-white"
                    : "max-w-[75%] rounded-lg bg-neutral-100 px-3 py-2 text-sm text-neutral-900"
                }
              >
                {mine ? null : <p className="mb-0.5 text-xs font-medium text-neutral-500">{m.senderName}</p>}
                <p className="whitespace-pre-wrap break-words">
                  <MessageBody body={m.body} memberNames={memberNames} />
                </p>
                <p className={mine ? "mt-1 text-[10px] text-purple-200" : "mt-1 text-[10px] text-neutral-400"}>
                  {new Date(m.createdAt).toLocaleString("en-MY", { timeZone: "Asia/Kuala_Lumpur" })}
                </p>
              </div>
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
        <div className="flex gap-2">
          <textarea
            ref={textareaRef}
            value={draft}
            onChange={(e) => onDraftChange(e.target.value)}
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
            className="rounded-md bg-purple-700 px-4 py-2 text-sm font-medium text-white hover:bg-purple-800 disabled:opacity-50"
          >
            <Bi zh="发送" en="Send" />
          </button>
        </div>
      </div>
    </div>
  );
}
