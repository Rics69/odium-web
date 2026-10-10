import "server-only";
import { revalidateTag } from "next/cache";
import { cacheTags } from "./cache-tags";

/**
 * Drops the cached catalogue and the pages of these addresses (the old one
 * too, after a change of slug). Works inside a Next.js request only.
 */
export function revalidateGames(slugs: string[]) {
  revalidateTag(cacheTags.games, { expire: 0 });
  revalidateTag(cacheTags.wishCounts, { expire: 0 });
  for (const slug of slugs) revalidateTag(cacheTags.game(slug), { expire: 0 });
}
