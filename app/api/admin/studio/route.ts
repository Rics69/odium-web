import { revalidateTag } from "next/cache";
import { getAdminStudio, saveStudio } from "@/lib/server/admin-studio";
import { cacheTags } from "@/lib/server/cache-tags";
import { apiRoute } from "@/lib/server/http";
import { adminOnly } from "@/lib/server/session";
import { studioInputSchema } from "@/lib/validation/admin-studio";

/** «О студии»: { studio }. */
export const GET = apiRoute({ guard: adminOnly }, async () => ({
  studio: await getAdminStudio(),
}));

/** The whole form: { changed }. The home page and footer update at once. */
export const PUT = apiRoute(
  { guard: adminOnly, body: studioInputSchema },
  async ({ user, body }) => {
    const changed = await saveStudio(user, body);
    if (changed) revalidateTag(cacheTags.studio, { expire: 0 });
    return { changed };
  },
);
