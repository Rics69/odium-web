import { revalidateTag } from "next/cache";
import { z } from "zod";
import { findBoardGame, listWishes } from "@/lib/server/board";
import { cacheTags } from "@/lib/server/cache-tags";
import { ApiError, apiRoute } from "@/lib/server/http";
import { getCurrentUser, requireVerifiedUser } from "@/lib/server/session";
import { createWish } from "@/lib/server/wishes";
import { slugSchema } from "@/lib/validation/games";
import { boardQuerySchema, wishInputSchema } from "@/lib/validation/wishes";

const params = z.object({ slug: slugSchema });

/** A page of the board: { wishes, nextCursor }, each with votedByMe. */
export const GET = apiRoute(
  { params, query: boardQuerySchema },
  async ({ params, query, request }) => {
    const game = await findBoardGame(params.slug);
    if (!game) throw new ApiError("NOT_FOUND");
    const viewer = await getCurrentUser(request.headers);
    return listWishes(game.id, query, viewer?.id ?? null);
  },
);

/** A new wish: signed in, email confirmed, within the limits. */
export const POST = apiRoute(
  { params, body: wishInputSchema },
  async ({ params, body, request }) => {
    const user = await requireVerifiedUser(request.headers);
    const wish = await createWish(user, params.slug, body);
    // The game page shows the top wishes and the count (step 3.8).
    revalidateTag(cacheTags.game(params.slug), { expire: 0 });
    revalidateTag(cacheTags.wishes(wish.gameId), { expire: 0 });
    return Response.json({ wish }, { status: 201 });
  },
);
