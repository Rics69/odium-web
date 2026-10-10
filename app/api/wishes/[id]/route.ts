import { z } from "zod";
import { ApiError, apiRoute } from "@/lib/server/http";
import { revalidateWishes } from "@/lib/server/revalidate-wishes";
import { getCurrentUser, requireVerifiedUser } from "@/lib/server/session";
import { deleteWish, getWish, updateWish } from "@/lib/server/wishes";
import { wishInputSchema } from "@/lib/validation/wishes";

const params = z.object({ id: z.uuid() });

/** One wish: { wish }. A hidden one for its author and admins only. */
export const GET = apiRoute({ params }, async ({ params, request }) => {
  const wish = await getWish(params.id, await getCurrentUser(request.headers));
  if (!wish) throw new ApiError("NOT_FOUND");
  return { wish };
});

/** The author's edit: 15 minutes after posting, while "new". */
export const PATCH = apiRoute(
  { params, body: wishInputSchema },
  async ({ params, body, request }) => {
    const user = await requireVerifiedUser(request.headers);
    const { gameId } = await updateWish(user, params.id, body);
    // A stop word in the new text hides the wish: the counts change.
    await revalidateWishes(gameId, { counts: true });
    return { wish: await getWish(params.id, user) };
  },
);

/** The author deletes the wish while it is "new". */
export const DELETE = apiRoute({ params }, async ({ params, request }) => {
  const user = await requireVerifiedUser(request.headers);
  const { gameId } = await deleteWish(user, params.id);
  await revalidateWishes(gameId, { counts: true });
  return { deleted: true };
});
