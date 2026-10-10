import { z } from "zod";
import {
  deleteWishAsAdmin,
  getAdminWishes,
  moderateWish,
} from "@/lib/server/admin-wishes";
import { ApiError, apiRoute } from "@/lib/server/http";
import { revalidateWishes } from "@/lib/server/revalidate-wishes";
import { adminOnly } from "@/lib/server/session";
import { adminWishPatchSchema } from "@/lib/validation/admin-wishes";

const params = z.object({ id: z.uuid() });

/** Status, reply, hidden with a reason, text: { wish } as it became. */
export const PATCH = apiRoute(
  { guard: adminOnly, params, body: adminWishPatchSchema },
  async ({ user, params, body }) => {
    const { gameId, changed } = await moderateWish(user, params.id, body);
    if (changed) await revalidateWishes(gameId, { counts: true });
    const [wish] = await getAdminWishes([params.id]);
    if (!wish) throw new ApiError("NOT_FOUND");
    return { wish };
  },
);

/** A soft delete: gone from the boards now, for good in 30 days. */
export const DELETE = apiRoute(
  { guard: adminOnly, params },
  async ({ user, params }) => {
    const { gameId } = await deleteWishAsAdmin(user, params.id);
    await revalidateWishes(gameId, { counts: true });
    return { deleted: true };
  },
);
