import { describe, expect, it } from "vitest";
import { db } from "@/lib/db";
import { games, wishes } from "@/lib/db/schema";
import { queryPublishedGame, queryPublishedGames } from "./games";

async function addGame(
  values: Partial<typeof games.$inferInsert> & { slug: string },
) {
  const [game] = await db
    .insert(games)
    .values({ title: values.slug, published: true, ...values })
    .returning({ id: games.id });
  return game!.id;
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

  it("counts the wishes the board shows: any status, not hidden or deleted", async () => {
    const id = await addGame({ slug: "busy" });
    await addGame({ slug: "quiet" });
    const wish = (
      title: string,
      values: Partial<typeof wishes.$inferInsert> = {},
    ) => ({
      gameId: id,
      type: "add" as const,
      title,
      titleNormalized: title,
      ...values,
    });
    await db
      .insert(wishes)
      .values([
        wish("one"),
        wish("two", { status: "done" }),
        wish("three", { status: "declined" }),
        wish("hidden", { hidden: true, hiddenReason: "spam" }),
        wish("deleted", { deletedAt: new Date() }),
      ]);

    const list = await queryPublishedGames();

    expect(list.find((game) => game.slug === "busy")?.wishesCount).toBe(3);
    expect(list.find((game) => game.slug === "quiet")?.wishesCount).toBe(0);
    expect((await queryPublishedGame("busy"))?.wishesCount).toBe(3);
  });
});
