import { z } from "zod";
import { t } from "@/lib/i18n";
import { slugSchema } from "./games";
import { wishInputSchema, wishStatuses, wishTypes } from "./wishes";

// Moderation of wishes (spec, section 6): one set of rules for the admin's
// forms and its API.

export const REPLY_MAX = 1000;
export const VERSION_MAX = 30;
/** Rows changed by one bulk action. */
export const BULK_MAX = 100;

/** Why a moderator hides a wish. "flagged" is the stop words' own. */
export const moderatorReasons = [
  "spam",
  "abuse",
  "off_topic",
  "duplicate",
  "other",
] as const;

export const adminWishSorts = ["new", "old", "top"] as const;
/** All; on the boards; hidden for any reason; waiting after a stop word. */
export const adminVisibilities = [
  "all",
  "visible",
  "hidden",
  "review",
] as const;

// An empty field of the filter form means "any".
const optional = <T extends z.ZodType>(schema: T) =>
  z.preprocess(
    (value) => (value === "" ? undefined : value),
    schema.optional(),
  );

export const adminWishesQuerySchema = z.object({
  game: optional(slugSchema),
  status: optional(z.enum(wishStatuses)),
  type: optional(z.enum(wishTypes)),
  visibility: optional(z.enum(adminVisibilities)).transform(
    (value) => value ?? "all",
  ),
  author: optional(z.string().trim().max(24)),
  q: optional(z.string().trim().max(100)),
  sort: optional(z.enum(adminWishSorts)).transform((value) => value ?? "new"),
  cursor: optional(z.string().max(500)),
});
export type AdminWishesQuery = z.infer<typeof adminWishesQuerySchema>;

const replySchema = z
  .string()
  .trim()
  .max(REPLY_MAX, t("admin.wishes.errors.replyLong"));

const versionSchema = z
  .string()
  .trim()
  .max(VERSION_MAX, t("admin.wishes.errors.versionLong"));

/**
 * PATCH /api/admin/wishes/:id: only what changes. An empty reply or
 * version removes it. Hiding needs a reason; the text goes as a whole.
 */
export const adminWishPatchSchema = z
  .object({
    status: z.enum(wishStatuses).optional(),
    doneVersion: versionSchema.optional(),
    studioReply: replySchema.optional(),
    hidden: z.boolean().optional(),
    hiddenReason: z.enum(moderatorReasons).optional(),
    text: wishInputSchema.optional(),
  })
  .superRefine((patch, context) => {
    if (patch.hidden && !patch.hiddenReason) {
      context.addIssue({
        code: "custom",
        path: ["hiddenReason"],
        message: t("admin.wishes.errors.reasonRequired"),
      });
    }
  });
export type AdminWishPatch = z.infer<typeof adminWishPatchSchema>;

const ids = z
  .array(z.uuid())
  .min(1)
  .max(BULK_MAX)
  .transform((list) => [...new Set(list)]);

/** POST /api/admin/wishes/bulk: one action for the selected rows. */
export const adminWishBulkSchema = z
  .discriminatedUnion("action", [
    z.object({
      action: z.literal("hide"),
      ids,
      reason: z.enum(moderatorReasons, {
        error: t("admin.wishes.errors.reasonRequired"),
      }),
    }),
    z.object({ action: z.literal("show"), ids }),
    z.object({ action: z.literal("delete"), ids }),
    z.object({
      action: z.literal("status"),
      ids,
      status: z.enum(wishStatuses),
      doneVersion: versionSchema.optional(),
      studioReply: replySchema.optional(),
    }),
  ])
  .superRefine((input, context) => {
    if (
      input.action === "status" &&
      input.status === "declined" &&
      !input.studioReply
    ) {
      context.addIssue({
        code: "custom",
        path: ["studioReply"],
        message: t("admin.wishes.errors.replyRequired"),
      });
    }
  });
export type AdminWishBulk = z.infer<typeof adminWishBulkSchema>;
