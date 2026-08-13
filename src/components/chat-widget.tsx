"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, MessageCircle, X } from "lucide-react";
import { ChatRoom } from "@/components/chat-room";
import { Bi } from "@/components/bi";
import { useUnreadCount } from "@/lib/use-unread";
import { useLang } from "@/lib/use-lang";

type GroupSummary = {
  id: string;
  name: string;
  lastMessage: string | null;
  unread: number;
};

type ConversationData = {
  groupName: string;
  isGroupAdmin: boolean;
  members: { id: string; name: string }[];
  initialMessages: Parameters<typeof ChatRoom>[0]["initialMessages"];
};

const LIST_POLL_MS = 15000;

/**
 * Facebook-Messenger-style floating chat launcher — desktop only (hidden
 * below the sm breakpoint; on phones the dedicated /chat page + nav badge
 * is the whole experience, a corner popup would just cover the screen).
 * Mounted once in the dashboard shell.
 */
export function ChatWidget({ currentUserId }: { currentUserId: string }) {
  const lang = useLang();
  const t = (zh: string, en: string) => (lang === "en" ? en : zh);
  const unread = useUnreadCount();
  const [open, setOpen] = useState(false);
  const [groups, setGroups] = useState<GroupSummary[]>([]);
  const [activeGroupId, setActiveGroupId] = useState<string | null>(null);
  const [conversation, setConversation] = useState<ConversationData | null>(null);
  const [loadingConversation, setLoadingConversation] = useState(false);

  useEffect(() => {
    if (!open || activeGroupId) return;
    const poll = async () => {
      const res = await fetch("/api/chat/groups");
      if (!res.ok) return;
      const data = await res.json();
      setGroups(data.groups ?? []);
    };
    poll();
    const interval = setInterval(poll, LIST_POLL_MS);
    return () => clearInterval(interval);
  }, [open, activeGroupId]);

  const openGroup = async (groupId: string) => {
    setActiveGroupId(groupId);
    setLoadingConversation(true);
    setConversation(null);
    const [infoRes, messagesRes] = await Promise.all([
      fetch(`/api/chat/groups/${groupId}`),
      fetch(`/api/chat/groups/${groupId}/messages`),
    ]);
    if (infoRes.ok && messagesRes.ok) {
      const info = await infoRes.json();
      const messagesData = await messagesRes.json();
      setConversation({
        groupName: info.group.name,
        isGroupAdmin: info.isGroupAdmin,
        members: info.members,
        initialMessages: messagesData.messages,
      });
    }
    setLoadingConversation(false);
  };

  const backToList = () => {
    setActiveGroupId(null);
    setConversation(null);
  };

  return (
    <div className="fixed right-6 bottom-6 z-50 hidden sm:block">
      {open ? (
        <div className="mb-3 flex h-[28rem] w-96 flex-col overflow-hidden rounded-lg border border-neutral-200 bg-white shadow-xl">
          <div className="flex items-center justify-between border-b border-neutral-200 bg-purple-900 px-3 py-2 text-white">
            <div className="flex items-center gap-2">
              {activeGroupId ? (
                <button type="button" onClick={backToList} className="hover:opacity-80">
                  <ArrowLeft size={18} />
                </button>
              ) : null}
              <p className="truncate text-sm font-medium">
                {activeGroupId ? (conversation?.groupName ?? "…") : t("聊天", "Chat")}
              </p>
            </div>
            <button type="button" onClick={() => setOpen(false)} className="hover:opacity-80">
              <X size={18} />
            </button>
          </div>

          {activeGroupId ? (
            <div className="flex flex-1 flex-col overflow-hidden">
              {loadingConversation || !conversation ? (
                <p className="p-4 text-center text-sm text-neutral-400">
                  <Bi zh="加载中..." en="Loading..." />
                </p>
              ) : (
                <ChatRoom
                  groupId={activeGroupId}
                  currentUserId={currentUserId}
                  isGroupAdmin={conversation.isGroupAdmin}
                  initialMessages={conversation.initialMessages}
                  members={conversation.members}
                />
              )}
            </div>
          ) : (
            <div className="flex-1 overflow-y-auto">
              {groups.length === 0 ? (
                <p className="p-4 text-center text-sm text-neutral-400">
                  <Bi zh="还没有加入任何群组" en="Not in any groups yet" />
                </p>
              ) : (
                groups.map((g) => (
                  <button
                    key={g.id}
                    type="button"
                    onClick={() => openGroup(g.id)}
                    className="flex w-full items-center justify-between border-b border-neutral-100 px-3 py-2.5 text-left hover:bg-purple-50"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{g.name}</p>
                      <p className="truncate text-xs text-neutral-500">
                        {g.lastMessage ?? <Bi zh="暂无消息" en="No messages yet" />}
                      </p>
                    </div>
                    {g.unread > 0 ? (
                      <span className="ml-2 shrink-0 rounded-full bg-red-600 px-1.5 py-0.5 text-xs font-bold text-white">
                        {g.unread > 99 ? "99+" : g.unread}
                      </span>
                    ) : null}
                  </button>
                ))
              )}
              <Link
                href="/chat"
                className="block border-t border-neutral-100 px-3 py-2 text-center text-xs text-purple-700 hover:bg-purple-50"
              >
                <Bi zh="查看全部 / 新建群组" en="View all / new group" />
              </Link>
            </div>
          )}
        </div>
      ) : null}

      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="relative flex h-14 w-14 items-center justify-center rounded-full bg-purple-700 text-white shadow-lg hover:bg-purple-800"
        title={t("聊天", "Chat")}
        aria-label={t("聊天", "Chat")}
      >
        <MessageCircle size={24} />
        {!open && unread > 0 ? (
          <span className="absolute -top-1 -right-1 rounded-full bg-red-600 px-1.5 py-0.5 text-xs font-bold text-white">
            {unread > 99 ? "99+" : unread}
          </span>
        ) : null}
      </button>
    </div>
  );
}
