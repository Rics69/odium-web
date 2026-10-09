import { eq } from "drizzle-orm";
import { revalidateTag } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { games, wishes } from "@/lib/db/schema";
import { cacheTags } from "@/lib/server/cache-tags";
import { apiRoute } from "@/lib/server/http";
import { requireVerifiedUser } from "@/lib/server/session";
import { setVote } from "@/lib/server/votes";

const params = z.object({ id: z.uuid() });

// The counters on the game page and the board come from cached reads.
async function revalidateWish(wishId: string) {
  const [row] = await db
    .select({ gameId: wishes.gameId, slug: games.slug })
    .from(wishes)
    .innerJoin(games, eq(games.id, wishes.gameId))
    .where(eq(wishes.id, wishId));
  if (!row) return;
  revalidateTag(cacheTags.game(row.slug), { expire: 0 });
  revalidateTag(cacheTags.wishes(row.gameId), { expire: 0 });
}

function vote(on: boolean) {
  return apiRoute({ params }, async ({ params, request }) => {
    const user = await requireVerifiedUser(request.headers);
    const result = await setVote(user, params.id, on);
    await revalidateWish(params.id);
    return result;
  });
}

/** Puts the vote: { votesCount, votedByMe: true }. */
export const PUT = vote(true);
/** Takes it back: { votesCount, votedByMe: false }. */
export const DELETE = vote(false);
