"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Bi } from "@/components/bi";
import { useLang } from "@/lib/use-lang";
import { matchesQuery } from "@/lib/search";

type Group = {
  id: string;
  name: string;
  lastMessage: string | null;
  unread: number;
};

export function ChatGroupsClient({ groups, isAdmin }: { groups: Group[]; isAdmin: boolean }) {
  const lang = useLang();
  const t = (zh: string, en: string) => (lang === "en" ? en : zh);
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => groups.filter((g) => matchesQuery([g.name], search)), [groups, search]);

  return (
    <div className="space-y-3">
      {groups.length > 0 ? (
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={t("搜索群组...", "Search groups")}
          className="w-64 rounded-md border border-neutral-300 px-3 py-1.5 text-sm"
        />
      ) : null}

      <div className="space-y-2">
        {filtered.map((g) => (
          <Link
            key={g.id}
            href={`/chat/${g.id}`}
            className="flex items-center justify-between rounded-lg border border-neutral-200 p-4 hover:bg-neutral-50"
          >
            <div className="min-w-0 flex-1">
              <p className="font-medium">{g.name}</p>
              <p className="truncate text-xs text-neutral-500">
                {g.lastMessage ?? <Bi zh="暂无消息" en="No messages yet" />}
              </p>
            </div>
            {g.unread > 0 ? (
              <span className="ml-3 shrink-0 rounded-full bg-red-600 px-2 py-0.5 text-xs font-bold text-white">
                {g.unread > 99 ? "99+" : g.unread}
              </span>
            ) : null}
          </Link>
        ))}
        {groups.length === 0 ? (
          <p className="text-sm text-neutral-400">
            {isAdmin ? (
              <Bi zh="还没有群组，创建一个吧" en="No groups yet — create one above" />
            ) : (
              <Bi zh="还没有加入任何群组" en="Not in any groups yet" />
            )}
          </p>
        ) : filtered.length === 0 ? (
          <p className="text-sm text-neutral-400">
            <Bi zh="没有符合的群组" en="No matching groups" />
          </p>
        ) : null}
      </div>
    </div>
  );
}
