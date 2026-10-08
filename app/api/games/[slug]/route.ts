import { z } from "zod";
import { getPublishedGame } from "@/lib/server/games";
import { ApiError, apiRoute } from "@/lib/server/http";
import { slugSchema } from "@/lib/validation/games";

/** One published game; unknown and unpublished ones answer 404. */
export const GET = apiRoute(
  { params: z.object({ slug: slugSchema }) },
  async ({ params }) => {
    const game = await getPublishedGame(params.slug);
    if (!game) throw new ApiError("NOT_FOUND");
    return { game };
  },
);
