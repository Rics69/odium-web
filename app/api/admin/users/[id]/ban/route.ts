import { z } from "zod";
import { banUser, unbanUser } from "@/lib/server/admin-users";
import { apiRoute } from "@/lib/server/http";
import { revalidateWishes } from "@/lib/server/revalidate-wishes";
import { adminOnly } from "@/lib/server/session";
import { banSchema } from "@/lib/validation/admin-users";

const params = z.object({ id: z.uuid() });

/** Bans { reason, duration, wipe }: the player is signed out at once. */
export const POST = apiRoute(
  { guard: adminOnly, params, body: banSchema },
  async ({ user, params, body }) => {
    const { gameIds } = await banUser(user, params.id, body);
    for (const gameId of gameIds) {
      await revalidateWishes(gameId, { counts: true });
    }
    return { banned: true };
  },
);

/** Lifts the ban. */
export const DELETE = apiRoute(
  { guard: adminOnly, params },
  async ({ user, params }) => {
    await unbanUser(user, params.id);
    return { banned: false };
  },
);
