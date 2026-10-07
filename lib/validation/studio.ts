import { z } from "zod";

export const socialSchema = z.object({
  label: z.string().min(1).max(40),
  url: z.url(),
});
export type Social = z.infer<typeof socialSchema>;

// The name may stay empty until the person wants it on the site.
export const teamMemberSchema = z.object({
  name: z.string().max(80),
  role: z.string().min(1).max(80),
  photoUrl: z.string().min(1).nullable(),
});
export type TeamMember = z.infer<typeof teamMemberSchema>;
