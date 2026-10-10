import { createGame, listAdminGames } from "@/lib/server/admin-games";
import { apiRoute } from "@/lib/server/http";
import { revalidateGames } from "@/lib/server/revalidate-games";
import { adminOnly } from "@/lib/server/session";
import { gameInputSchema } from "@/lib/validation/admin-games";

/** Every game, drafts too: { games }. */
export const GET = apiRoute({ guard: adminOnly }, async () => ({
  games: await listAdminGames(),
}));

/** A new game: { id, slug }. */
export const POST = apiRoute(
  { guard: adminOnly, body: gameInputSchema },
  async ({ user, body }) => {
    const game = await createGame(user, body);
    revalidateGames([game.slug]);
    return Response.json(game, { status: 201 });
  },
);
