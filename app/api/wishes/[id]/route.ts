import { eq } from "drizzle-orm";
import { revalidateTag } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { games } from "@/lib/db/schema";
import { cacheTags } from "@/lib/server/cache-tags";
import { ApiError, apiRoute } from "@/lib/server/http";
import { getCurrentUser, requireVerifiedUser } from "@/lib/server/session";
import { deleteWish, getWish, updateWish } from "@/lib/server/wishes";
import { wishInputSchema } from "@/lib/validation/wishes";

const params = z.object({ id: z.uuid() });

async function revalidateGame(gameId: string) {
  const [game] = await db
    .select({ slug: games.slug })
    .from(games)
    .where(eq(games.id, gameId));
  if (game) revalidateTag(cacheTags.game(game.slug), { expire: 0 });
  revalidateTag(cacheTags.wishes(gameId), { expire: 0 });
}

/** One wish: { wish }. A hidden one for its author and admins only. */
export const GET = apiRoute({ params }, async ({ params, request }) => {
  const wish = await getWish(params.id, await getCurrentUser(request.headers));
  if (!wish) throw new ApiError("NOT_FOUND");
  return { wish };
});

/** The author's edit: 15 minutes after posting, while "new". */
export const PATCH = apiRoute(
  { params, body: wishInputSchema },
  async ({ params, body, request }) => {
    const user = await requireVerifiedUser(request.headers);
    const { gameId } = await updateWish(user, params.id, body);
    await revalidateGame(gameId);
    return { wish: await getWish(params.id, user) };
  },
);

/** The author deletes the wish while it is "new". */
export const DELETE = apiRoute({ params }, async ({ params, request }) => {
  const user = await requireVerifiedUser(request.headers);
  const { gameId } = await deleteWish(user, params.id);
  await revalidateGame(gameId);
  return { deleted: true };
});
