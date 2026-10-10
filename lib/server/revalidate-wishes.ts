import "server-only";
import { eq } from "drizzle-orm";
import { revalidateTag } from "next/cache";
import { db } from "@/lib/db";
import { games } from "@/lib/db/schema";
import { cacheTags } from "./cache-tags";

/**
 * Refreshes the cached reads a wish change shows on: the top wishes of the
 * game page always, and the counts (the catalogue and the game) when a wish
 * came, went or was hidden. Works inside a Next.js request only.
 */
export async function revalidateWishes(
  gameId: string,
  { counts }: { counts: boolean },
) {
  revalidateTag(cacheTags.wishes(gameId), { expire: 0 });
  if (!counts) return;
  revalidateTag(cacheTags.wishCounts, { expire: 0 });
  const [game] = await db
    .select({ slug: games.slug })
    .from(games)
    .where(eq(games.id, gameId));
  if (game) revalidateTag(cacheTags.game(game.slug), { expire: 0 });
}
