import { eq, lt } from "drizzle-orm";
import { del } from "@vercel/blob";
import { db } from "@/db";
import { jobs } from "@/db/schema";
import { parsePhotos } from "@/lib/photos";

// Old job photos are just storage cost at this point — the job record
// itself (pay, status, history) stays forever, only the photo files and the
// job's photos array get cleared once the job is old enough.
const PHOTO_RETENTION_DAYS = 60;

export async function sweepOldPhotos() {
  const cutoffDate = new Date(Date.now() - PHOTO_RETENTION_DAYS * 24 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 10);

  const candidates = await db
    .select({ id: jobs.id, photos: jobs.photos })
    .from(jobs)
    .where(lt(jobs.schedDate, cutoffDate));

  let jobsCleaned = 0;
  let filesDeleted = 0;
  for (const job of candidates) {
    const photos = parsePhotos(job.photos);
    if (photos.length === 0) continue;

    try {
      await del(photos.map((p) => p.url));
    } catch (err) {
      // Leave this job's photos array alone if the blob delete failed —
      // otherwise we'd lose the URLs without ever having freed the storage.
      // It'll be retried on the next sweep.
      console.error(`sweepOldPhotos: failed to delete blobs for job ${job.id}`, err);
      continue;
    }

    await db.update(jobs).set({ photos: [] }).where(eq(jobs.id, job.id));
    jobsCleaned++;
    filesDeleted += photos.length;
  }

  return { jobsCleaned, filesDeleted };
}
