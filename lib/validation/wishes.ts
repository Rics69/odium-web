import { z } from "zod";
import { t } from "@/lib/i18n";

// A new wish: one set of rules for the form and the API (spec, sections 5
// and 7).

export const wishTypes = ["add", "remove"] as const;
export type WishType = (typeof wishTypes)[number];

export const wishStatuses = [
  "new",
  "review",
  "planned",
  "in_progress",
  "done",
  "declined",
] as const;
export type WishStatus = (typeof wishStatuses)[number];

export const TITLE_MIN = 5;
export const TITLE_MAX = 100;
export const BODY_MAX = 2000;
export const MAX_LINKS = 2;
const CAPS_FROM = 11;

const LINK = /(?:https?:\/\/|www\.)\S+/gi;

/** Links in a text: http(s):// and www. addresses. */
export function countLinks(text: string): number {
  return text.match(LINK)?.length ?? 0;
}

/** «ДОБАВЬТЕ БОЛЬШЕ УРОВНЕЙ»: a title over 10 characters, all capitals. */
export function isShouting(title: string): boolean {
  return (
    title.length >= CAPS_FROM &&
    title === title.toUpperCase() &&
    title !== title.toLowerCase()
  );
}

export const wishInputSchema = z
  .object({
    type: z.enum(wishTypes, { error: t("wishes.errors.type") }),
    title: z
      .string({ error: t("wishes.errors.titleShort") })
      .trim()
      .min(TITLE_MIN, t("wishes.errors.titleShort"))
      .max(TITLE_MAX, t("wishes.errors.titleLong"))
      .refine((title) => !isShouting(title), t("wishes.errors.titleShouting")),
    body: z
      .string()
      .trim()
      .max(BODY_MAX, t("wishes.errors.bodyLong"))
      .default(""),
  })
  .superRefine((wish, context) => {
    if (countLinks(`${wish.title} ${wish.body}`) > MAX_LINKS) {
      context.addIssue({
        code: "custom",
        path: ["body"],
        message: t("wishes.errors.links"),
      });
    }
  });
export type WishInput = z.infer<typeof wishInputSchema>;

export const boardSorts = ["top", "new", "trending", "old"] as const;
export type BoardSort = (typeof boardSorts)[number];

/**
 * The board's choices, as they sit in the address (spec, section 5):
 * ?sort=top&type=add&status=planned&q=…&mine=1&voted=1. Without `status`
 * the board hides done and declined wishes; status=all shows everything.
 */
export const boardQuerySchema = z.object({
  sort: z.enum(boardSorts).default("top"),
  type: z.enum(wishTypes).optional(),
  status: z.union([z.enum(wishStatuses), z.literal("all")]).optional(),
  q: z.string().trim().max(100).optional(),
  mine: z.literal("1").optional(),
  voted: z.literal("1").optional(),
  cursor: z.string().max(500).optional(),
});
export type BoardQuery = z.infer<typeof boardQuerySchema>;
