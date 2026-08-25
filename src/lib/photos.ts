import { z } from "zod";

export const PHOTO_KINDS = ["photo", "before", "after"] as const;
export type PhotoKind = (typeof PHOTO_KINDS)[number];

export const photoEntrySchema = z.object({
  url: z.string().url(),
  kind: z.enum(PHOTO_KINDS),
  idx: z.number().int().nonnegative(),
});

export type PhotoEntry = z.infer<typeof photoEntrySchema>;

export const photosArraySchema = z.array(photoEntrySchema);

export function parsePhotos(value: unknown): PhotoEntry[] {
  const result = photosArraySchema.safeParse(value);
  return result.success ? result.data : [];
}

/**
 * donePhotos on the user profile is a simple "does this employee need a
 * completion photo at all" flag (any positive value means yes) — the
 * minimum required is always 1 once that's on. Employees can upload more
 * than one if they want (e.g. several screenshots of a post), up to
 * MAX_COMPLETION_PHOTOS.
 */
export function requiredPhotoCount(donePhotos: number | null | undefined): number {
  return (donePhotos ?? 0) > 0 ? 1 : 0;
}

export const MAX_COMPLETION_PHOTOS = 10;
