import { apiRoute } from "@/lib/server/http";
import { getPublishedGames } from "@/lib/server/games";

/** Published games in catalogue order. */
export const GET = apiRoute({}, async () => ({
  games: await getPublishedGames(),
}));
