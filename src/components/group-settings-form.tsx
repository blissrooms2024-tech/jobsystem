"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Bi } from "@/components/bi";
import { useLang } from "@/lib/use-lang";

type SimpleUser = { id: string; name: string; role: string };

export function GroupSettingsForm({
  groupId,
  initialName,
  members,
  candidates,
}: {
  groupId: string;
  initialName: string;
  members: SimpleUser[];
  candidates: SimpleUser[];
}) {
  const router = useRouter();
  const lang = useLang();
  const t = (zh: string, en: string) => (lang === "en" ? en : zh);
  const [name, setName] = useState(initialName);
  const [selectedToAdd, setSelectedToAdd] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const memberIds = useMemo(() => new Set(members.map((m) => m.id)), [members]);
  const addable = candidates.filter((c) => !memberIds.has(c.id));

  const rename = () => {
    setError(null);
    startTransition(async () => {
      const res = await fetch(`/api/chat/groups/${groupId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim() }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(typeof data.error === "string" ? data.error : "失败 Failed");
        return;
      }
      router.refresh();
    });
  };

  const removeMember = (userId: string) => {
    setError(null);
    startTransition(async () => {
      const res = await fetch(`/api/chat/groups/${groupId}/members/${userId}`, { method: "DELETE" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(typeof data.error === "string" ? data.error : "失败 Failed");
        return;
      }
      router.refresh();
    });
  };

  const addMembers = () => {
    if (selectedToAdd.length === 0) return;
    setError(null);
    startTransition(async () => {
      const res = await fetch(`/api/chat/groups/${groupId}/members`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userIds: selectedToAdd }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(typeof data.error === "string" ? data.error : "失败 Failed");
        return;
      }
      setSelectedToAdd([]);
      router.refresh();
    });
  };

  const deleteGroup = () => {
    if (!confirm(t("确定要解散这个群组吗？这会删除所有消息，不能恢复。", "Delete this group? This removes all messages and can't be undone."))) {
      return;
    }
    setError(null);
    startTransition(async () => {
      const res = await fetch(`/api/chat/groups/${groupId}`, { method: "DELETE" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(typeof data.error === "string" ? data.error : "失败 Failed");
        return;
      }
      router.push("/chat");
    });
  };

  return (
    <div className="space-y-6">
      <div className="rounded-lg border border-neutral-200 p-4">
        <p className="mb-2 text-sm font-medium">
          <Bi zh="群组名称" en="Group name" />
        </p>
        <div className="flex gap-2">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="flex-1 rounded-md border border-neutral-300 px-3 py-1.5 text-sm"
          />
          <button
            type="button"
            disabled={isPending || !name.trim() || name.trim() === initialName}
            onClick={rename}
            className="rounded-md bg-purple-700 px-3 py-1.5 text-sm font-medium text-white hover:bg-purple-800 disabled:opacity-50"
          >
            <Bi zh="保存" en="Save" />
          </button>
        </div>
      </div>

      <div className="rounded-lg border border-neutral-200 p-4">
        <p className="mb-2 text-sm font-medium">
          <Bi zh="成员" en="Members" /> ({members.length})
        </p>
        <div className="space-y-1">
          {members.map((m) => (
            <div key={m.id} className="flex items-center justify-between rounded px-2 py-1 text-sm hover:bg-neutral-50">
              <span>
                {m.name} <span className="text-xs capitalize text-neutral-400">{m.role}</span>
              </span>
              <button
                type="button"
                disabled={isPending}
                onClick={() => removeMember(m.id)}
                title={t("移除", "Remove")}
                aria-label={t("移除", "Remove")}
                className="rounded px-2 py-0.5 text-xs text-red-600 hover:bg-red-50 disabled:opacity-50"
              >
                ✕
              </button>
            </div>
          ))}
        </div>

        {addable.length > 0 ? (
          <div className="mt-3 border-t border-neutral-100 pt-3">
            <p className="mb-1 text-xs text-neutral-500">
              <Bi zh="添加成员" en="Add members" />
            </p>
            <div className="max-h-40 space-y-1 overflow-y-auto rounded-md border border-neutral-200 p-2">
              {addable.map((u) => (
                <label key={u.id} className="flex items-center gap-2 rounded px-1 py-1 text-sm hover:bg-neutral-50">
                  <input
                    type="checkbox"
                    checked={selectedToAdd.includes(u.id)}
                    onChange={() =>
                      setSelectedToAdd((prev) =>
                        prev.includes(u.id) ? prev.filter((x) => x !== u.id) : [...prev, u.id],
                      )
                    }
                  />
                  <span>{u.name}</span>
                  <span className="text-xs capitalize text-neutral-400">{u.role}</span>
                </label>
              ))}
            </div>
            <button
              type="button"
              disabled={isPending || selectedToAdd.length === 0}
              onClick={addMembers}
              className="mt-2 rounded-md bg-purple-700 px-3 py-1.5 text-sm font-medium text-white hover:bg-purple-800 disabled:opacity-50"
            >
              <Bi zh="添加" en="Add" />
            </button>
          </div>
        ) : null}
      </div>

      {error ? <p className="text-sm text-red-600">{error}</p> : null}

      <div className="rounded-lg border border-red-200 p-4">
        <p className="mb-2 text-sm font-medium text-red-700">
          <Bi zh="解散群组" en="Delete group" />
        </p>
        <p className="mb-2 text-xs text-neutral-500">
          <Bi
            zh="解散后所有成员会失去这个群组，消息也会一并删除。"
            en="All members lose access to this group and its messages are deleted."
          />
        </p>
        <button
          type="button"
          disabled={isPending}
          onClick={deleteGroup}
          className="rounded-md border border-red-300 px-3 py-1.5 text-sm font-medium text-red-700 hover:bg-red-50 disabled:opacity-50"
        >
          <Bi zh="解散群组" en="Delete group" />
        </button>
      </div>
    </div>
  );
}
