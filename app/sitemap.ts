import { and, eq, isNull } from "drizzle-orm";
import type { MetadataRoute } from "next";
import { connection } from "next/server";
import { db } from "@/lib/db";
import { games, wishes } from "@/lib/db/schema";
import { env } from "@/lib/env";

/**
 * Every page worth finding (spec, section 10): the home page, the
 * catalogue, each published game with its board and its visible wishes.
 * Read from the database on each request: there is none at build time.
 * One file holds up to 50 000 addresses; past that it is split with
 * generateSitemaps.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  await connection();
  const url = (path: string) => new URL(path, env.SITE_URL).toString();

  const [gameRows, wishRows] = await Promise.all([
    db
      .select({ slug: games.slug, updatedAt: games.updatedAt })
      .from(games)
      .where(eq(games.published, true)),
    db
      .select({
        id: wishes.id,
        slug: games.slug,
        updatedAt: wishes.updatedAt,
      })
      .from(wishes)
      .innerJoin(games, eq(games.id, wishes.gameId))
      .where(
        and(
          eq(games.published, true),
          eq(wishes.hidden, false),
          isNull(wishes.deletedAt),
        ),
      ),
  ]);

  const latest = (dates: Date[]) =>
    dates.length > 0
      ? new Date(Math.max(...dates.map((date) => date.getTime())))
      : undefined;
  const boardUpdated = (slug: string) =>
    latest(
      wishRows.filter((wish) => wish.slug === slug).map((w) => w.updatedAt),
    );

  return [
    { url: url("/"), lastModified: latest(gameRows.map((g) => g.updatedAt)) },
    {
      url: url("/games"),
      lastModified: latest(gameRows.map((g) => g.updatedAt)),
    },
    ...gameRows.flatMap((game) => [
      { url: url(`/games/${game.slug}`), lastModified: game.updatedAt },
      {
        url: url(`/games/${game.slug}/wishes`),
        lastModified: boardUpdated(game.slug) ?? game.updatedAt,
      },
    ]),
    ...wishRows.map((wish) => ({
      url: url(`/games/${wish.slug}/wishes/${wish.id}`),
      lastModified: wish.updatedAt,
    })),
  ];
}
