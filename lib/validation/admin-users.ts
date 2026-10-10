import { z } from "zod";
import { t } from "@/lib/i18n";

// Players in the admin (spec, section 6): search, bans and roles.

export const BAN_REASON_MAX = 500;
export const banDurations = ["1d", "7d", "30d", "forever"] as const;
export type BanDuration = (typeof banDurations)[number];
/** Days of each ban; "forever" has no end. */
export const banDays: Record<Exclude<BanDuration, "forever">, number> = {
  "1d": 1,
  "7d": 7,
  "30d": 30,
};

export const adminUserStates = ["all", "banned", "unverified"] as const;

// An empty field of the search form means "any".
const optional = <T extends z.ZodType>(schema: T) =>
  z.preprocess(
    (value) => (value === "" ? undefined : value),
    schema.optional(),
  );

export const adminUsersQuerySchema = z.object({
  q: optional(z.string().trim().max(254)),
  role: optional(z.enum(["admin"])),
  state: optional(z.enum(adminUserStates)).transform((value) => value ?? "all"),
  cursor: optional(z.string().max(500)),
});
export type AdminUsersQuery = z.infer<typeof adminUsersQuerySchema>;

/** POST /api/admin/users/:id/ban. */
export const banSchema = z.object({
  duration: z.enum(banDurations, {
    error: t("admin.users.errors.duration"),
  }),
  reason: z
    .string({ error: t("admin.users.errors.reasonRequired") })
    .trim()
    .min(1, t("admin.users.errors.reasonRequired"))
    .max(BAN_REASON_MAX, t("admin.users.errors.reasonLong")),
  /** Hide all their wishes and take back all their votes. */
  wipe: z.boolean().default(false),
});
export type BanInput = z.infer<typeof banSchema>;

/** PATCH /api/admin/users/:id/role. */
export const roleSchema = z.object({ role: z.enum(["user", "admin"]) });
