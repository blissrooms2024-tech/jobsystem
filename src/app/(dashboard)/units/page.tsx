import { db } from "@/db";
import { units } from "@/db/schema";
import { UnitsPageClient } from "@/components/units-page-client";

export default async function UnitsPage() {
  const rows = await db.select().from(units);

  return <UnitsPageClient rows={rows} />;
}
