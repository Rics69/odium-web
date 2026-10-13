import { z } from "zod";
import { t } from "@/lib/i18n/admin";

// «О студии» and the two lists of the admin (spec, sections 6 and 7).

export const STUDIO_TAGLINE_MAX = 120;
export const ABOUT_MAX = 2000;
export const MISSION_MAX = 400;
export const TEAM_MAX = 30;
export const SOCIALS_MAX = 10;
export const STOP_WORDS_MAX = 2000;
export const DOMAINS_MAX = 20000;

const text = (max: number, key: Parameters<typeof t>[0]) =>
  z.string().trim().max(max, t(key)).default("");

export const studioInputSchema = z.object({
  tagline: text(STUDIO_TAGLINE_MAX, "admin.studio.errors.taglineLong"),
  aboutMd: text(ABOUT_MAX, "admin.studio.errors.aboutLong"),
  mission: text(MISSION_MAX, "admin.studio.errors.missionLong"),
  team: z
    .array(
      z.object({
        // Not on the site for now: only roles are (the owner's decision).
        name: z.string().trim().max(80, t("admin.studio.errors.nameLong")),
        role: z
          .string()
          .trim()
          .min(1, t("admin.studio.errors.roleRequired"))
          .max(80, t("admin.studio.errors.roleLong")),
        photoUrl: z.null().default(null),
      }),
    )
    .max(TEAM_MAX)
    .default([]),
  socials: z
    .array(
      z.object({
        label: z
          .string()
          .trim()
          .min(1, t("admin.studio.errors.labelRequired"))
          .max(40, t("admin.studio.errors.labelLong")),
        url: z.url({
          protocol: /^https?$/,
          error: t("admin.studio.errors.socialUrl"),
        }),
      }),
    )
    .max(SOCIALS_MAX)
    .default([]),
  // Kept for the studio; never shown on the site (the owner's decision).
  contactEmail: z
    .string()
    .trim()
    .toLowerCase()
    .transform((email) => email || null)
    .pipe(z.email(t("admin.studio.errors.email")).nullable())
    .nullable()
    .default(null),
});
export type StudioInput = z.infer<typeof studioInputSchema>;

/** One entry per line or in an array; empty lines go, repeats merge. */
const list = (item: z.ZodString, max: number) =>
  z
    .array(z.string())
    .transform((items) =>
      items.map((value) => value.trim().toLowerCase()).filter(Boolean),
    )
    .pipe(z.array(item).max(max))
    .transform((items) => [...new Set(items)].sort());

/** PUT /api/admin/stop-words: the whole list. */
export const stopWordsSchema = z.object({
  words: list(
    z
      .string()
      .min(2, t("admin.lists.errors.wordShort"))
      .max(60, t("admin.lists.errors.wordLong")),
    STOP_WORDS_MAX,
  ),
});

// mailinator.com, temp-mail.org: letters, digits and hyphens, a dot
// between labels, at least two labels.
const DOMAIN =
  /^(?=.{3,253}$)([a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/;

/** PUT /api/admin/blocked-domains: the whole list. */
export const blockedDomainsSchema = z.object({
  domains: list(
    z.string().regex(DOMAIN, t("admin.lists.errors.domain")),
    DOMAINS_MAX,
  ),
});
