import { eq } from "drizzle-orm";
import { auth } from "@/auth";
import { db } from "@/db";
import { courseCompletions, courses, jobTypes } from "@/db/schema";
import { CoursesPageClient } from "@/components/courses-page-client";
import { Bi } from "@/components/bi";

export default async function CoursesPage() {
  const session = await auth();
  const user = session!.user;
  const isAdmin = user.role === "boss" || user.role === "admin";

  const [rows, jobTypeRows, myCompletions] = await Promise.all([
    db.select().from(courses).orderBy(courses.title),
    db.select({ id: jobTypes.id, typeName: jobTypes.typeName }).from(jobTypes),
    db
      .select({ courseId: courseCompletions.courseId })
      .from(courseCompletions)
      .where(eq(courseCompletions.userId, user.id)),
  ]);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-lg font-semibold">
          <Bi zh="培训课程" en="Training" />
        </h1>
        <p className="text-sm text-neutral-500">
          <Bi
            zh="有些任务类型要求先看完对应的教学视频，才能打卡/完成该类型的任务。"
            en="Some job types require watching the matching training video before you can check in / complete that type of job."
          />
        </p>
      </div>
      <CoursesPageClient
        rows={rows}
        jobTypes={jobTypeRows}
        completedIds={myCompletions.map((c) => c.courseId)}
        isAdmin={isAdmin}
      />
    </div>
  );
}
