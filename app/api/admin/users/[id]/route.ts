import { z } from "zod";
import { getAdminUser } from "@/lib/server/admin-users";
import { ApiError, apiRoute } from "@/lib/server/http";
import { adminOnly } from "@/lib/server/session";

const params = z.object({ id: z.uuid() });

/** The player's card: { user } with history and latest wishes. */
export const GET = apiRoute(
  { guard: adminOnly, params },
  async ({ params }) => {
    const card = await getAdminUser(params.id);
    if (!card) throw new ApiError("NOT_FOUND");
    return { user: card };
  },
);
