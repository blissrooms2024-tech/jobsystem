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
