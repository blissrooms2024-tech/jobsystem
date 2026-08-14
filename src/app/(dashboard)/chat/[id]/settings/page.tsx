import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { auth } from "@/auth";
import { db } from "@/db";
import { chatGroups, chatGroupMembers, users } from "@/db/schema";
import { GroupSettingsForm } from "@/components/group-settings-form";
import { Bi } from "@/components/bi";

export default async function ChatGroupSettingsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await auth();
  const user = session!.user;

  const [group] = await db.select().from(chatGroups).where(eq(chatGroups.id, id)).limit(1);
  if (!group) notFound();
  if (group.createdBy !== user.id) notFound();

  const members = await db
    .select({ id: users.id, name: users.name, role: users.role, staffId: users.staffId, userCode: users.userCode })
    .from(chatGroupMembers)
    .innerJoin(users, eq(chatGroupMembers.userId, users.id))
    .where(eq(chatGroupMembers.groupId, id));

  const candidates = await db
    .select({ id: users.id, name: users.name, role: users.role, staffId: users.staffId, userCode: users.userCode })
    .from(users)
    .where(eq(users.active, true));

  return (
    <div className="max-w-xl space-y-4">
      <h1 className="text-lg font-semibold">
        <Bi zh="群组设置" en="Group settings" /> · {group.name}
      </h1>
      <GroupSettingsForm groupId={id} initialName={group.name} members={members} candidates={candidates} />
    </div>
  );
}
