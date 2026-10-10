import { getAdminWishes, moderateWishes } from "@/lib/server/admin-wishes";
import { apiRoute } from "@/lib/server/http";
import { revalidateWishes } from "@/lib/server/revalidate-wishes";
import { adminOnly } from "@/lib/server/session";
import { adminWishBulkSchema } from "@/lib/validation/admin-wishes";

/**
 * One action for up to 100 selected wishes: { changedIds, wishes } — the
 * changed ones as they became (none after a delete).
 */
export const POST = apiRoute(
  { guard: adminOnly, body: adminWishBulkSchema },
  async ({ user, body }) => {
    const { changedIds, gameIds } = await moderateWishes(user, body);
    for (const gameId of gameIds) {
      await revalidateWishes(gameId, { counts: true });
    }
    return { changedIds, wishes: await getAdminWishes(changedIds) };
  },
);
