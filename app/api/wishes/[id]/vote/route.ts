import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db";
import { wishes } from "@/lib/db/schema";
import { apiRoute } from "@/lib/server/http";
import { revalidateWishes } from "@/lib/server/revalidate-wishes";
import { requireVerifiedUser } from "@/lib/server/session";
import { setVote } from "@/lib/server/votes";

const params = z.object({ id: z.uuid() });

// A vote may reorder the top wishes of the game page.
async function revalidateWish(wishId: string) {
  const [row] = await db
    .select({ gameId: wishes.gameId })
    .from(wishes)
    .where(eq(wishes.id, wishId));
  if (row) await revalidateWishes(row.gameId, { counts: false });
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
