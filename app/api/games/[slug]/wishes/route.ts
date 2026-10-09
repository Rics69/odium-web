import { revalidateTag } from "next/cache";
import { z } from "zod";
import { cacheTags } from "@/lib/server/cache-tags";
import { apiRoute } from "@/lib/server/http";
import { requireVerifiedUser } from "@/lib/server/session";
import { createWish } from "@/lib/server/wishes";
import { slugSchema } from "@/lib/validation/games";
import { wishInputSchema } from "@/lib/validation/wishes";

/** A new wish: signed in, email confirmed, within the limits. */
export const POST = apiRoute(
  { params: z.object({ slug: slugSchema }), body: wishInputSchema },
  async ({ params, body, request }) => {
    const user = await requireVerifiedUser(request.headers);
    const wish = await createWish(user, params.slug, body);
    // The game page shows the top wishes and the count (step 3.8).
    revalidateTag(cacheTags.game(params.slug), { expire: 0 });
    revalidateTag(cacheTags.wishes(wish.gameId), { expire: 0 });
    return Response.json({ wish }, { status: 201 });
  },
);
