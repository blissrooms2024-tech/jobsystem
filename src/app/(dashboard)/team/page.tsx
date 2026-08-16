import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { auth } from "@/auth";
import { db } from "@/db";
import { users } from "@/db/schema";
import { TeamListClient } from "@/components/team-list-client";
import { Bi } from "@/components/bi";

export default async function TeamPage() {
  const session = await auth();
  const currentUser = session!.user;
  if (currentUser.role !== "supervisor") notFound();

  const rows = await db
    .select({
      id: users.id,
      name: users.name,
      staffId: users.staffId,
      staffType: users.staffType,
      phone: users.phone,
      active: users.active,
    })
    .from(users)
    .where(eq(users.supervisorId, currentUser.id))
    .orderBy(users.staffId);

  return (
    <div className="max-w-2xl space-y-4">
      <h1 className="text-lg font-semibold">
        <Bi zh="我的下属" en="My Team" />
      </h1>
      <TeamListClient rows={rows} />
    </div>
  );
}
