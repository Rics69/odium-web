import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import { db } from "@/lib/db";
import { games, user, votes, wishes } from "@/lib/db/schema";
import { normalizeTitle } from "@/lib/wishes";

async function addPlayer(nickname = `P_${randomUUID().slice(0, 8)}`) {
  const [row] = await db
    .insert(user)
    .values({ nickname, email: `${nickname.toLowerCase()}@example.com` })
    .returning({ id: user.id });
  return row!.id;
}

async function addGame() {
  const [row] = await db
    .insert(games)
    .values({ slug: `game-${randomUUID().slice(0, 8)}`, title: "Game" })
    .returning({ id: games.id });
  return row!.id;
}

function addWish(gameId: string, authorId: string, title: string) {
  return db
    .insert(wishes)
    .values({
      gameId,
      authorId,
      type: "add",
      title,
      titleNormalized: normalizeTitle(title),
    })
    .returning({ id: wishes.id })
    .then(([row]) => row!.id);
}

describe("the wish board schema", () => {
  it("refuses the same wish twice from one author in one game", async () => {
    const [gameId, authorId] = [await addGame(), await addPlayer()];
    await addWish(gameId, authorId, "Больше уровней");

    await expect(
      addWish(gameId, authorId, "  больше   УРОВНЕЙ"),
    ).rejects.toThrow();
    // Another author, another game: fine.
    await addWish(gameId, await addPlayer(), "Больше уровней");
    await addWish(await addGame(), authorId, "Больше уровней");
  });

  it("lets an author post a wish again once the old one is deleted", async () => {
    const [gameId, authorId] = [await addGame(), await addPlayer()];
    const first = await addWish(gameId, authorId, "Тёмная тема");
    await db
      .update(wishes)
      .set({ deletedAt: new Date() })
      .where(eq(wishes.id, first));

    await expect(
      addWish(gameId, authorId, "Темная тема"),
    ).resolves.toBeTruthy();
  });

  it("allows one vote per player per wish", async () => {
    const wishId = await addWish(await addGame(), await addPlayer(), "Кооп");
    const voter = await addPlayer();
    await db.insert(votes).values({ wishId, userId: voter });

    await expect(
      db.insert(votes).values({ wishId, userId: voter }),
    ).rejects.toThrow();
  });

  it("keeps wishes of a deleted account without an author and drops its votes", async () => {
    const gameId = await addGame();
    const author = await addPlayer();
    const wishId = await addWish(gameId, author, "Фоторежим");
    await db.insert(votes).values({ wishId, userId: author });

    await db.delete(user).where(eq(user.id, author));

    const [wish] = await db
      .select({ authorId: wishes.authorId })
      .from(wishes)
      .where(eq(wishes.id, wishId));
    expect(wish).toEqual({ authorId: null });
    expect(await db.$count(votes)).toBe(0);
  });

  it("does not let a game with wishes be deleted", async () => {
    const gameId = await addGame();
    await addWish(gameId, await addPlayer(), "Новый уровень");

    await expect(
      db.delete(games).where(eq(games.id, gameId)),
    ).rejects.toThrow();
  });

  it("never lets a vote counter go below zero", async () => {
    const wishId = await addWish(await addGame(), await addPlayer(), "Ачивки");

    await expect(
      db.update(wishes).set({ votesCount: -1 }).where(eq(wishes.id, wishId)),
    ).rejects.toThrow();
  });
});
