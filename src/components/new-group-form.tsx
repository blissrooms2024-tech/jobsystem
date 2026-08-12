"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Bi } from "@/components/bi";

type SimpleUser = { id: string; name: string; role: string };

export function NewGroupForm({ users }: { users: SimpleUser[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const toggle = (id: string) => {
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-md bg-purple-700 px-3 py-2 text-sm font-medium text-white hover:bg-purple-800"
      >
        + <Bi zh="新建群组" en="New group" />
      </button>
    );
  }

  return (
    <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-4">
      <div className="space-y-3">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="群组名称 Group name"
          className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm"
        />
        <div>
          <p className="mb-1 text-xs text-neutral-500">
            <Bi zh="选择成员" en="Select members" />
          </p>
          <div className="max-h-48 space-y-1 overflow-y-auto rounded-md border border-neutral-200 bg-white p-2">
            {users.map((u) => (
              <label key={u.id} className="flex items-center gap-2 rounded px-1 py-1 text-sm hover:bg-neutral-50">
                <input type="checkbox" checked={selected.includes(u.id)} onChange={() => toggle(u.id)} />
                <span>{u.name}</span>
                <span className="text-xs capitalize text-neutral-400">{u.role}</span>
              </label>
            ))}
          </div>
        </div>
        {error ? <p className="text-sm text-red-600">{error}</p> : null}
        <div className="flex gap-2">
          <button
            type="button"
            disabled={isPending || !name.trim()}
            onClick={() => {
              setError(null);
              startTransition(async () => {
                const res = await fetch("/api/chat/groups", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ name: name.trim(), memberIds: selected }),
                });
                const data = await res.json().catch(() => ({}));
                if (!res.ok) {
                  setError(typeof data.error === "string" ? data.error : "创建失败 Failed to create");
                  return;
                }
                router.push(`/chat/${data.group.id}`);
              });
            }}
            className="rounded-md bg-purple-700 px-3 py-2 text-sm font-medium text-white hover:bg-purple-800 disabled:opacity-50"
          >
            {isPending ? <Bi zh="创建中..." en="Creating..." /> : <Bi zh="创建" en="Create" />}
          </button>
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="rounded-md border border-neutral-300 px-3 py-2 text-sm hover:bg-white"
          >
            <Bi zh="取消" en="Cancel" />
          </button>
        </div>
      </div>
    </div>
  );
}
