import { describe, expect, it } from "vitest";
import { db } from "@/lib/db";
import { games } from "@/lib/db/schema";
import { queryPublishedGame, queryPublishedGames } from "./games";

async function addGame(
  values: Partial<typeof games.$inferInsert> & { slug: string },
) {
  await db
    .insert(games)
    .values({ title: values.slug, published: true, ...values });
}

describe("games", () => {
  it("lists only published games, in catalogue order", async () => {
    await addGame({ slug: "second", sortOrder: 2 });
    await addGame({ slug: "first", sortOrder: 1 });
    await addGame({ slug: "hidden", sortOrder: 0, published: false });

    const list = await queryPublishedGames();

    expect(list.map((game) => game.slug)).toEqual(["first", "second"]);
  });

  it("finds a published game by slug and hides the rest", async () => {
    await addGame({
      slug: "open",
      platforms: [{ store: "rustore", url: null }],
    });
    await addGame({ slug: "secret", published: false });

    expect(await queryPublishedGame("open")).toMatchObject({
      slug: "open",
      platforms: [{ store: "rustore", url: null }],
    });
    expect(await queryPublishedGame("secret")).toBeNull();
    expect(await queryPublishedGame("missing")).toBeNull();
  });

  it("returns only JSON values, so the cache stores them unchanged", async () => {
    await addGame({ slug: "dated", releaseDate: "2026-12-01" });

    const game = await queryPublishedGame("dated");

    expect(game).toEqual(JSON.parse(JSON.stringify(game)));
    expect(game?.releaseDate).toBe("2026-12-01");
  });
});
