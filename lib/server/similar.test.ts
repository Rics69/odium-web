import { randomUUID } from "node:crypto";
import { describe, expect, it } from "vitest";
import { db } from "@/lib/db";
import { games, wishes } from "@/lib/db/schema";
import { normalizeTitle } from "@/lib/wishes";
import { findSimilarWishes } from "./board";

async function board(titles: (string | { title: string; hidden: boolean })[]) {
  const [game] = await db
    .insert(games)
    .values({
      slug: `game-${randomUUID().slice(0, 8)}`,
      title: "G",
      published: true,
    })
    .returning({ id: games.id });
  for (const item of titles) {
    const { title, hidden } =
      typeof item === "string" ? { title: item, hidden: false } : item;
    await db.insert(wishes).values({
      gameId: game!.id,
      type: "add",
      title,
      titleNormalized: normalizeTitle(title),
      hidden,
      hiddenReason: hidden ? "spam" : null,
    });
  }
  return game!.id;
}

describe("similar wishes", () => {
  it("finds titles like the one being typed, closest first", async () => {
    const gameId = await board([
      "Тёмная тема",
      "Тёмная тема для глаз",
      "Больше уровней",
      "Режим на время",
    ]);

    const titles = (await findSimilarWishes(gameId, "темная тема", null)).map(
      (wish) => wish.title,
    );

    expect(titles).toEqual(["Тёмная тема", "Тёмная тема для глаз"]);
  });

  it("shows three at most and never hidden ones", async () => {
    const gameId = await board([
      "Новые уровни",
      "Новые уровни в лесу",
      "Новые уровни в горах",
      "Новые уровни под водой",
      { title: "Новые уровни за деньги", hidden: true },
    ]);

    const found = await findSimilarWishes(gameId, "новые уровни", null);

    expect(found).toHaveLength(3);
    expect(found.map((wish) => wish.title)).not.toContain(
      "Новые уровни за деньги",
    );
  });

  it("looks only at the same game", async () => {
    await board(["Кооператив"]);
    const other = await board(["Совсем другое"]);

    expect(await findSimilarWishes(other, "кооператив", null)).toEqual([]);
  });
});
