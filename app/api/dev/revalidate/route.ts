import { revalidateTag } from "next/cache";
import { db } from "@/lib/db";
import { games } from "@/lib/db/schema";
import { cacheTags } from "@/lib/server/cache-tags";

// Development only: `npm run db:seed` calls this so a running dev server drops
// its cached reads at once. Production answers 404.
export async function POST() {
  if (process.env.NODE_ENV === "production") {
    return new Response(null, { status: 404 });
  }
  const tags: string[] = [
    cacheTags.games,
    cacheTags.studio,
    cacheTags.wishCounts,
  ];
  for (const game of await db.select({ id: games.id }).from(games)) {
    tags.push(cacheTags.wishes(game.id));
  }
  for (const tag of tags) revalidateTag(tag, { expire: 0 });
  return Response.json({ revalidated: tags });
}
