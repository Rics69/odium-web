import { z } from "zod";

// Where a game can be found. Shared by the database types, the seed and the
// admin forms (step 4.5).
export const stores = [
  "google_play",
  "rustore",
  "appgallery",
  "app_store",
  "yandex_games",
  "steam",
  "web",
] as const;
export const storeSchema = z.enum(stores);
export type Store = z.infer<typeof storeSchema>;

// No URL yet means "coming to this store".
export const platformLinkSchema = z.object({
  store: storeSchema,
  url: z.url().nullable(),
});
export type PlatformLink = z.infer<typeof platformLinkSchema>;

// Sizes are kept so the scattered gallery can lay screenshots out before
// they load.
export const screenshotSchema = z.object({
  url: z.string().min(1),
  width: z.number().int().positive(),
  height: z.number().int().positive(),
  alt: z.string(),
});
export type Screenshot = z.infer<typeof screenshotSchema>;

export const gameStatuses = ["released", "in_development"] as const;
export type GameStatus = (typeof gameStatuses)[number];

// Lowercase latin words joined by hyphens: derevnya-slov.
export const slugSchema = z
  .string()
  .max(60)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
