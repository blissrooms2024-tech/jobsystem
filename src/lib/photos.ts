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
 * Every no-checkin employee now needs exactly one completion photo, not a
 * per-employee configurable count — donePhotos on the user profile is kept
 * as a simple "does this employee need one at all" flag (any positive value
 * means yes), rather than the literal number required.
 */
export function requiredPhotoCount(donePhotos: number | null | undefined): number {
  return (donePhotos ?? 0) > 0 ? 1 : 0;
}
