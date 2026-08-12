import { db } from "@/db";
import { users } from "@/db/schema";
import { UsersPageClient } from "@/components/users-page-client";

export default async function UsersPage() {
  const rows = await db.select().from(users).orderBy(users.staffId, users.userCode);

  return <UsersPageClient rows={rows} />;
}
