import { z } from "zod";
import { t } from "@/lib/i18n";
import { parseTrailer } from "@/lib/trailer";
import {
  gameStatuses,
  screenshotSchema,
  SLUG_MAX,
  SLUG_PATTERN,
  storeSchema,
} from "./games";

// A game in the admin (spec, section 6): one set of rules for the form
// and the API.

export const TITLE_MAX = 80;
export const TAGLINE_MAX = 160;
export const GENRE_MAX = 60;
export const DESCRIPTION_MAX = 10_000;
export const SCREENSHOTS_MAX = 12;
export const ALT_MAX = 200;

/** Our own images only: uploaded ones and the placeholders of the seed. */
const imagePath = z
  .string()
  .regex(/^\/(uploads|placeholders)\/[\w.-]+$/, t("admin.games.errors.image"));

export const gameInputSchema = z.object({
  title: z
    .string({ error: t("admin.games.errors.titleRequired") })
    .trim()
    .min(1, t("admin.games.errors.titleRequired"))
    .max(TITLE_MAX, t("admin.games.errors.titleLong")),
  slug: z
    .string({ error: t("admin.games.errors.slug") })
    .trim()
    .max(SLUG_MAX, t("admin.games.errors.slug"))
    .regex(SLUG_PATTERN, t("admin.games.errors.slug")),
  tagline: z
    .string()
    .trim()
    .max(TAGLINE_MAX, t("admin.games.errors.taglineLong"))
    .default(""),
  descriptionMd: z
    .string()
    .trim()
    .max(DESCRIPTION_MAX, t("admin.games.errors.descriptionLong"))
    .default(""),
  genre: z
    .string()
    .trim()
    .max(GENRE_MAX, t("admin.games.errors.genreLong"))
    .default(""),
  coverUrl: imagePath.nullable().default(null),
  screenshots: z
    .array(
      screenshotSchema.extend({
        url: imagePath,
        alt: z.string().trim().max(ALT_MAX),
      }),
    )
    .max(SCREENSHOTS_MAX, t("admin.games.errors.screenshotsMax"))
    .default([]),
  trailerUrl: z
    .string()
    .trim()
    .transform((link) => link || null)
    .refine(
      (link) => link === null || parseTrailer(link) !== null,
      t("admin.games.errors.trailer"),
    )
    .nullable()
    .default(null),
  platforms: z
    .array(
      z.object({
        store: storeSchema,
        // Web addresses only: a store link goes into href as is.
        url: z
          .url({
            protocol: /^https?$/,
            error: t("admin.games.errors.storeUrl"),
          })
          .nullable(),
      }),
    )
    .refine(
      (links) => new Set(links.map((link) => link.store)).size === links.length,
      t("admin.games.errors.storeTwice"),
    )
    .default([]),
  status: z.enum(gameStatuses),
  releaseDate: z
    .string()
    .transform((date) => date || null)
    .refine(
      (date) => date === null || /^\d{4}-\d{2}-\d{2}$/.test(date),
      t("admin.games.errors.date"),
    )
    .nullable()
    .default(null),
  sortOrder: z.coerce
    .number({ error: t("admin.games.errors.sortOrder") })
    .int(t("admin.games.errors.sortOrder"))
    .min(-1000, t("admin.games.errors.sortOrder"))
    .max(1000, t("admin.games.errors.sortOrder")),
  wishesOpen: z.boolean(),
  published: z.boolean(),
});
export type GameInput = z.infer<typeof gameInputSchema>;
