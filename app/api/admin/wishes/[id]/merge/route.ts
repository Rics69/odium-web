import { z } from "zod";
import { getAdminWishes, mergeWish } from "@/lib/server/admin-wishes";
import { apiRoute } from "@/lib/server/http";
import { revalidateWishes } from "@/lib/server/revalidate-wishes";
import { adminOnly } from "@/lib/server/session";

const params = z.object({ id: z.uuid() });
const body = z.object({ targetId: z.uuid() });

/**
 * Merges this duplicate into { targetId }: { wish, original, movedVotes },
 * both wishes as they became.
 */
export const POST = apiRoute(
  { guard: adminOnly, params, body },
  async ({ user, params, body }) => {
    const { gameId, movedVotes } = await mergeWish(
      user,
      params.id,
      body.targetId,
    );
    await revalidateWishes(gameId, { counts: true });
    const rows = await getAdminWishes([params.id, body.targetId]);
    return {
      wish: rows.find((row) => row.id === params.id),
      original: rows.find((row) => row.id === body.targetId),
      movedVotes,
    };
  },
);
