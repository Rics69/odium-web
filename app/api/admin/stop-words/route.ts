import { getStopWords, saveStopWords } from "@/lib/server/admin-studio";
import { apiRoute } from "@/lib/server/http";
import { adminOnly } from "@/lib/server/session";
import { stopWordsSchema } from "@/lib/validation/admin-studio";

/** { words }, alphabetical. */
export const GET = apiRoute({ guard: adminOnly }, async () => ({
  words: await getStopWords(),
}));

/** The whole list: { added, removed }. */
export const PUT = apiRoute(
  { guard: adminOnly, body: stopWordsSchema },
  async ({ user, body }) => saveStopWords(user, body.words),
);
