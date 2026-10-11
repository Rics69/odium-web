import { z } from "zod";
import { adminActionNames, adminTargets } from "@/lib/admin-actions";

// An empty field of the filter form means "any".
const optional = <T extends z.ZodType>(schema: T) =>
  z.preprocess(
    (value) => (value === "" ? undefined : value),
    schema.optional(),
  );

/** The journal's filters (spec, section 6): who, what, on what. */
export const journalQuerySchema = z.object({
  admin: optional(z.uuid()),
  action: optional(z.enum(adminActionNames as [string, ...string[]])),
  type: optional(z.enum(adminTargets)),
  /** One object: a wish, a player or a game by id. */
  target: optional(z.string().max(100)),
  cursor: optional(z.string().max(500)),
});
export type JournalQuery = z.infer<typeof journalQuerySchema>;
