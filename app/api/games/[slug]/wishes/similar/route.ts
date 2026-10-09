import { z } from "zod";
import { findBoardGame, findSimilarWishes } from "@/lib/server/board";
import { ApiError, apiRoute } from "@/lib/server/http";
import { getCurrentUser } from "@/lib/server/session";
import { slugSchema } from "@/lib/validation/games";

/** Up to 3 wishes like the title being typed: { wishes }. */
export const GET = apiRoute(
  {
    params: z.object({ slug: slugSchema }),
    query: z.object({ q: z.string().trim().min(3).max(100) }),
  },
  async ({ params, query, request }) => {
    const game = await findBoardGame(params.slug);
    if (!game) throw new ApiError("NOT_FOUND");
    const viewer = await getCurrentUser(request.headers);
    return {
      wishes: await findSimilarWishes(game.id, query.q, viewer?.id ?? null),
    };
  },
);
