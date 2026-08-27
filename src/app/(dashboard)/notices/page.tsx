import { and, eq, gte, isNull, lte, or } from "drizzle-orm";
import { auth } from "@/auth";
import { db } from "@/db";
import { notices } from "@/db/schema";
import { myToday } from "@/lib/job-timing";
import { NoticesAdmin } from "@/components/notices-admin";
import { NoticesList } from "@/components/notices-list";
import { Bi } from "@/components/bi";

export default async function NoticesPage() {
  const session = await auth();
  const user = session!.user;
  const isAdmin = user.role === "boss" || user.role === "admin";

  if (isAdmin) {
    return (
      <div className="max-w-2xl space-y-6">
        <h1 className="text-lg font-semibold">
          <Bi zh="公告" en="Notices" />
        </h1>
        <NoticesAdmin />
      </div>
    );
  }

  const today = myToday();
  const activeNotices = await db
    .select()
    .from(notices)
    .where(
      and(
        eq(notices.active, true),
        or(isNull(notices.startDate), lte(notices.startDate, today)),
        or(isNull(notices.endDate), gte(notices.endDate, today)),
      ),
    );

  return (
    <div className="max-w-2xl space-y-4">
      <h1 className="text-lg font-semibold">
        <Bi zh="公告" en="Notices" />
      </h1>
      {activeNotices.length === 0 ? (
        <p className="text-sm text-neutral-400">
          <Bi zh="暂无公告" en="No notices right now" />
        </p>
      ) : (
        <NoticesList notices={activeNotices.map((n) => ({ id: n.id, title: n.title, content: n.content }))} />
      )}
    </div>
  );
}
