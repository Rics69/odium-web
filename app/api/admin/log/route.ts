import { listJournal } from "@/lib/server/admin-journal";
import { apiRoute } from "@/lib/server/http";
import { adminOnly } from "@/lib/server/session";
import { journalQuerySchema } from "@/lib/validation/admin-log";

/** The admin journal: { entries, nextCursor }, newest first. */
export const GET = apiRoute(
  { guard: adminOnly, query: journalQuerySchema },
  async ({ query }) => listJournal(query),
);
