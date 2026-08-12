import { db } from "@/db";
import { jobTypes } from "@/db/schema";
import { JobTypesPageClient } from "@/components/job-types-page-client";

export default async function JobTypesPage() {
  const rows = await db.select().from(jobTypes);

  return <JobTypesPageClient rows={rows} />;
}
