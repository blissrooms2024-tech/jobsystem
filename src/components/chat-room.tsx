"use client";

import { useEffect, useRef, useState } from "react";
import { Bi } from "@/components/bi";
import { useLang } from "@/lib/use-lang";

type Message = {
  id: string;
  body: string;
  createdAt: string;
  senderId: string;
  senderName: string;
};

const POLL_MS = 4000;

export function ChatRoom({
  groupId,
  currentUserId,
  initialMessages,
}: {
  groupId: string;
  currentUserId: string;
  initialMessages: Message[];
}) {
  const lang = useLang();
  const t = (zh: string, en: string) => (lang === "en" ? en : zh);
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const poll = async () => {
      const res = await fetch(`/api/chat/groups/${groupId}/messages`);
      if (!res.ok) return;
      const data = await res.json();
      setMessages(data.messages);
    };
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
      }
    }
    setSending(false);
  };

  return (
    <div className="flex flex-1 flex-col overflow-hidden rounded-lg border border-neutral-200">
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
                <p className="whitespace-pre-wrap break-words">{m.body}</p>
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
      <div className="flex gap-2 border-t border-neutral-200 p-3">
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              send();
            }
          }}
          rows={1}
          placeholder={t("输入消息...", "Type a message")}
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
  );
}
