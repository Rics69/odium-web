import { randomUUID } from "node:crypto";
import { eq, sql } from "drizzle-orm";
import { NextRequest } from "next/server";
import { describe, expect, it } from "vitest";
import { PUT } from "@/app/api/wishes/[id]/vote/route";
import { db } from "@/lib/db";
import { games, user, votes, wishes } from "@/lib/db/schema";
import type { CurrentUser } from "./session";
import { setVote } from "./votes";

// Players straight in the database: voting needs no password.
async function players(count: number): Promise<CurrentUser[]> {
  const rows = await db
    .insert(user)
    .values(
      Array.from({ length: count }, () => {
        const id = randomUUID().slice(0, 8);
        return {
          nickname: `P_${id}`,
          email: `${id}@example.com`,
          emailVerified: true,
        };
      }),
    )
    .returning();
  return rows.map((row) => ({
    id: row.id,
    nickname: row.nickname,
    email: row.email,
    emailVerified: true,
    role: "user",
    createdAt: row.createdAt,
  }));
}

async function addWish(values: Partial<typeof wishes.$inferInsert> = {}) {
  const slug = `game-${randomUUID().slice(0, 8)}`;
  const [game] = await db
    .insert(games)
    .values({ slug, title: slug, published: true })
    .returning({ id: games.id });
  const [row] = await db
    .insert(wishes)
    .values({
      gameId: game!.id,
      type: "add",
      title: "Больше уровней",
      titleNormalized: "больше уровней",
      ...values,
    })
    .returning({ id: wishes.id });
  return row!.id;
}

async function counter(wishId: string) {
  const [row] = await db
    .select({
      votesCount: wishes.votesCount,
      real: sql<number>`(select count(*)::int from ${votes} where ${votes.wishId} = ${wishes.id})`,
    })
    .from(wishes)
    .where(eq(wishes.id, wishId));
  return row!;
}

describe("voting", () => {
  it("puts a vote and takes it back; asking twice changes nothing", async () => {
    const wishId = await addWish();
    const [voter] = await players(1);

    expect(await setVote(voter!, wishId, true)).toEqual({
      votesCount: 1,
      votedByMe: true,
    });
    expect(await setVote(voter!, wishId, true)).toEqual({
      votesCount: 1,
      votedByMe: true,
    });
    expect(await setVote(voter!, wishId, false)).toEqual({
      votesCount: 0,
      votedByMe: false,
    });
    expect(await setVote(voter!, wishId, false)).toEqual({
      votesCount: 0,
      votedByMe: false,
    });
  });

  it("gives exactly +1 for 50 votes of one player at once", async () => {
    const wishId = await addWish();
    const [voter] = await players(1);

    await Promise.all(
      Array.from({ length: 50 }, () => setVote(voter!, wishId, true)),
    );

    expect(await counter(wishId)).toEqual({ votesCount: 1, real: 1 });
  });

  it("counts 50 players voting at once, and keeps count when they change their minds", async () => {
    const wishId = await addWish();
    const voters = await players(50);

    await Promise.all(voters.map((voter) => setVote(voter, wishId, true)));
    expect(await counter(wishId)).toEqual({ votesCount: 50, real: 50 });

    await Promise.all(
      voters.flatMap((voter, index) => [
        setVote(voter, wishId, index % 2 === 0),
        setVote(voter, wishId, index % 3 === 0),
      ]),
    );
    const { votesCount, real } = await counter(wishId);
    expect(votesCount).toBe(real);
  });

  it("is closed for done and declined wishes", async () => {
    const [voter] = await players(1);
    for (const status of ["done", "declined"] as const) {
      const wishId = await addWish({ status });
      await expect(setVote(voter!, wishId, true)).rejects.toMatchObject({
        code: "VOTING_CLOSED",
      });
      await expect(setVote(voter!, wishId, false)).rejects.toMatchObject({
        code: "VOTING_CLOSED",
      });
    }
  });

  it("does not see hidden, deleted wishes and those of an unpublished game", async () => {
    const [voter] = await players(1);
    const hidden = await addWish({ hidden: true, hiddenReason: "spam" });
    const deleted = await addWish({ deletedAt: new Date() });
    const unpublished = await addWish();
    await db
      .update(games)
      .set({ published: false })
      .where(
        eq(
          games.id,
          db
            .select({ id: wishes.gameId })
            .from(wishes)
            .where(eq(wishes.id, unpublished)),
        ),
      );

    for (const wishId of [hidden, deleted, unpublished, randomUUID()]) {
      await expect(setVote(voter!, wishId, true)).rejects.toMatchObject({
        code: "NOT_FOUND",
      });
    }
  });

  it("allows 60 votes a minute", async () => {
    const wishId = await addWish();
    const [voter] = await players(1);
    for (let i = 0; i < 60; i++) await setVote(voter!, wishId, i % 2 === 0);

    await expect(setVote(voter!, wishId, true)).rejects.toMatchObject({
      code: "RATE_LIMITED",
    });
  });
});

// The 200 answer is checked in e2e: revalidateTag needs a real request.
describe("PUT /api/wishes/:id/vote", () => {
  function put(id: string, headers: Record<string, string> = {}) {
    return PUT(
      new NextRequest(`http://localhost:3100/api/wishes/${id}/vote`, {
        method: "PUT",
        headers: {
          host: "localhost:3100",
          origin: "http://localhost:3100",
          "x-forwarded-for": "203.0.113.5",
          ...headers,
        },
      }),
      { params: Promise.resolve({ id }) },
    );
  }

  it("sends a guest to sign in", async () => {
    expect((await put(await addWish())).status).toBe(401);
  });

  it("answers 404 for an address that is not a wish id", async () => {
    expect((await put("not-a-uuid")).status).toBe(404);
  });
});
