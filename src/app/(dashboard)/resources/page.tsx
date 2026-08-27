import { and, eq, isNull, or } from "drizzle-orm";
import { auth } from "@/auth";
import { db } from "@/db";
import { resources, units, users } from "@/db/schema";
import { ResourcesPageClient } from "@/components/resources-page-client";
import { NoticesAdmin } from "@/components/notices-admin";
import { Bi } from "@/components/bi";

export default async function ResourcesPage() {
  const session = await auth();
  const user = session!.user;
  const isAdmin = user.role === "boss" || user.role === "admin";

  const [me] = await db.select({ staffType: users.staffType }).from(users).where(eq(users.id, user.id)).limit(1);

  const scopeCondition = isAdmin
    ? undefined
    : and(
        or(isNull(resources.staffType), eq(resources.staffType, me?.staffType ?? "")),
        or(isNull(resources.userId), eq(resources.userId, user.id)),
      );

  const rows = await db
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
    .where(scopeCondition)
    .orderBy(resources.type, resources.title);

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

  return (
    <div className="max-w-3xl space-y-6">
      <h1 className="text-lg font-semibold">
        <Bi zh="资源" en="Resources" />
      </h1>

      {isAdmin ? <NoticesAdmin /> : null}

      <ResourcesPageClient rows={rows} units={unitOptions} employees={employeeOptions} isAdmin={isAdmin} />
    </div>
  );
}
