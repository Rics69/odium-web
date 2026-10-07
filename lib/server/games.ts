import "server-only";
import { and, asc, eq } from "drizzle-orm";
import { unstable_cache } from "next/cache";
import { db } from "@/lib/db";
import { games } from "@/lib/db/schema";
import { cacheTags } from "./cache-tags";

const gameColumns = {
  slug: games.slug,
  title: games.title,
  tagline: games.tagline,
  descriptionMd: games.descriptionMd,
  coverUrl: games.coverUrl,
  screenshots: games.screenshots,
  trailerUrl: games.trailerUrl,
  genre: games.genre,
  platforms: games.platforms,
  status: games.status,
  releaseDate: games.releaseDate,
  wishesOpen: games.wishesOpen,
};

// Plain JSON only (no Date objects): cached results are stored as JSON.
export type Game = Awaited<ReturnType<typeof queryPublishedGames>>[number];

/** Published games in catalogue order. */
export async function queryPublishedGames() {
  return db
    .select(gameColumns)
    .from(games)
    .where(eq(games.published, true))
    .orderBy(asc(games.sortOrder), asc(games.title));
}

/** A published game by slug, or null (unknown or unpublished). */
export async function queryPublishedGame(slug: string): Promise<Game | null> {
  const [game] = await db
    .select(gameColumns)
    .from(games)
    .where(and(eq(games.slug, slug), eq(games.published, true)))
    .limit(1);
  return game ?? null;
}

export const getPublishedGames = unstable_cache(
  queryPublishedGames,
  ["games"],
  {
    tags: [cacheTags.games],
  },
);

export function getPublishedGame(slug: string) {
  return unstable_cache(() => queryPublishedGame(slug), ["game", slug], {
    tags: [cacheTags.games, cacheTags.game(slug)],
  })();
}
