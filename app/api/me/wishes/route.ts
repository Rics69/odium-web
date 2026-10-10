import { z } from "zod";
import { listMyWishes } from "@/lib/server/board";
import { apiRoute } from "@/lib/server/http";
import { requireUser } from "@/lib/server/session";

const query = z.object({ cursor: z.string().max(500).optional() });

/** The player's wishes across all games, hidden ones with the reason. */
export const GET = apiRoute({ query }, async ({ query, request }) => {
  const user = await requireUser(request.headers);
  return listMyWishes(user.id, query.cursor);
});
