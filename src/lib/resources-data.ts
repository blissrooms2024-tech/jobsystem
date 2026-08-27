import { and, eq, isNull, or } from "drizzle-orm";
import { db } from "@/db";
import { resources, units, users } from "@/db/schema";

/** Shared data-loading for the /resources and /contacts pages — both list
 * from the same `resources` table, filtered to whichever types the page
 * cares about, and scoped for non-admins to what applies to them. */
export async function getResourcesData(userId: string, role: string) {
  const isAdmin = role === "boss" || role === "admin";

  const [me] = await db.select({ staffType: users.staffType }).from(users).where(eq(users.id, userId)).limit(1);

  const scopeCondition = isAdmin
    ? undefined
    : and(
        or(isNull(resources.staffType), eq(resources.staffType, me?.staffType ?? "")),
        or(isNull(resources.userId), eq(resources.userId, userId)),
      );

  const rows = await db
    .select({
      id: resources.id,
      type: resources.type,
      title: resources.title,
      content: resources.content,
      url: resources.url,
      unitIds: resources.unitIds,
      staffType: resources.staffType,
      userId: resources.userId,
      assigneeName: users.name,
      assigneeStaffId: users.staffId,
      assigneeUserCode: users.userCode,
    })
    .from(resources)
    .leftJoin(users, eq(resources.userId, users.id))
    .where(scopeCondition)
    .orderBy(resources.type, resources.title);

  // Fetched for everyone (not just admins) so non-admin viewers can resolve
  // unit names for display — unitIds is just a plain array, no FK join.
  const unitOptions = await db.select({ id: units.id, unitName: units.unitName }).from(units).orderBy(units.unitName);

  const employeeOptions = isAdmin
    ? await db
        .select({ id: users.id, name: users.name, staffId: users.staffId, userCode: users.userCode })
        .from(users)
        .where(eq(users.active, true))
        .orderBy(users.staffId, users.userCode)
    : [];

  return { isAdmin, rows, unitOptions, employeeOptions };
}
