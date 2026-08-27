import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { auth } from "@/auth";
import { db } from "@/db";
import { resources, units, users } from "@/db/schema";
import { ResourceDetailClient } from "@/components/resource-detail-client";

export default async function ResourceDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await auth();
  const user = session!.user;
  const isAdmin = user.role === "boss" || user.role === "admin";

  const [row] = await db
    .select({
      id: resources.id,
      type: resources.type,
      title: resources.title,
      content: resources.content,
      url: resources.url,
      unitId: resources.unitId,
      unitName: units.unitName,
      staffType: resources.staffType,
      userId: resources.userId,
      assigneeName: users.name,
      assigneeStaffId: users.staffId,
      assigneeUserCode: users.userCode,
    })
    .from(resources)
    .leftJoin(units, eq(resources.unitId, units.id))
    .leftJoin(users, eq(resources.userId, users.id))
    .where(eq(resources.id, id))
    .limit(1);

  if (!row) notFound();

  if (!isAdmin) {
    const [me] = await db.select({ staffType: users.staffType }).from(users).where(eq(users.id, user.id)).limit(1);
    const staffTypeOk = !row.staffType || row.staffType === me?.staffType;
    const userOk = !row.userId || row.userId === user.id;
    if (!staffTypeOk || !userOk) notFound();
  }

  const unitOptions = isAdmin
    ? await db.select({ id: units.id, unitName: units.unitName }).from(units).orderBy(units.unitName)
    : [];
  const employeeOptions = isAdmin
    ? await db
        .select({ id: users.id, name: users.name, staffId: users.staffId, userCode: users.userCode })
        .from(users)
        .where(eq(users.active, true))
        .orderBy(users.staffId, users.userCode)
    : [];

  return <ResourceDetailClient row={row} units={unitOptions} employees={employeeOptions} isAdmin={isAdmin} />;
}
