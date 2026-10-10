import { z } from "zod";
import { deleteGame, getAdminGame, updateGame } from "@/lib/server/admin-games";
import { ApiError, apiRoute } from "@/lib/server/http";
import { revalidateGames } from "@/lib/server/revalidate-games";
import { adminOnly } from "@/lib/server/session";
import { gameInputSchema } from "@/lib/validation/admin-games";

const params = z.object({ id: z.uuid() });

/** One game: { game }. */
export const GET = apiRoute(
  { guard: adminOnly, params },
  async ({ params }) => {
    const game = await getAdminGame(params.id);
    if (!game) throw new ApiError("NOT_FOUND");
    return { game };
  },
);

/** The whole form: { game } as it became. */
export const PATCH = apiRoute(
  { guard: adminOnly, params, body: gameInputSchema },
  async ({ user, params, body }) => {
    const { slugs, changed } = await updateGame(user, params.id, body);
    if (changed) revalidateGames(slugs);
    return { game: await getAdminGame(params.id) };
  },
);

/** Only a game without wishes; one with them is taken off the site. */
export const DELETE = apiRoute(
  { guard: adminOnly, params },
  async ({ user, params }) => {
    const { slug } = await deleteGame(user, params.id);
    revalidateGames([slug]);
    return { deleted: true };
  },
);
