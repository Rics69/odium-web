import { revalidateTag } from "next/cache";
import { cacheTags } from "@/lib/server/cache-tags";

// Development only: `npm run db:seed` calls this so a running dev server drops
// its cached reads at once. Production answers 404.
export async function POST() {
  if (process.env.NODE_ENV === "production") {
    return new Response(null, { status: 404 });
  }
  revalidateTag(cacheTags.games, { expire: 0 });
  revalidateTag(cacheTags.studio, { expire: 0 });
  return Response.json({ revalidated: [cacheTags.games, cacheTags.studio] });
}
