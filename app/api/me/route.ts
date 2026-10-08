import { apiRoute } from "@/lib/server/http";
import { getCurrentUser } from "@/lib/server/session";

/** The signed-in player, or { user: null } for a guest. */
export const GET = apiRoute({}, async ({ request }) => ({
  user: await getCurrentUser(request.headers),
}));
