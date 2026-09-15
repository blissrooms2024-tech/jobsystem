import { eq } from "drizzle-orm";
import { db } from "@/db";
import { courseCompletions, courses } from "@/db/schema";

/**
 * Throws a bilingual error if the given user hasn't completed every course
 * tied to this job type yet. No-op if the job has no jobTypeId, or that job
 * type has no required courses.
 */
export async function assertTrainingComplete(userId: string, jobTypeId: string | null) {
  if (!jobTypeId) return;

  const required = await db.select().from(courses).where(eq(courses.jobTypeId, jobTypeId));
  if (required.length === 0) return;

  const completions = await db
    .select({ courseId: courseCompletions.courseId })
    .from(courseCompletions)
    .where(eq(courseCompletions.userId, userId));
  const completedIds = new Set(completions.map((c) => c.courseId));

  const missing = required.filter((c) => !completedIds.has(c.id));
  if (missing.length > 0) {
    const titles = missing.map((c) => c.title).join("、");
    throw new Error(
      `请先完成培训课程后才能开始此任务：${titles} Please complete training first: ${missing.map((c) => c.title).join(", ")}`,
    );
  }
}
