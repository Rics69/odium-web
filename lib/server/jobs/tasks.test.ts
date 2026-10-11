import { randomUUID } from "node:crypto";
import { utimes } from "node:fs/promises";
import path from "node:path";
import { eq } from "drizzle-orm";
import sharp from "sharp";
import { afterEach, describe, expect, it, vi } from "vitest";
import { db } from "@/lib/db";
import {
  games,
  rateLimits,
  session,
  user,
  verification,
  votes,
  wishes,
} from "@/lib/db/schema";
import { env } from "@/lib/env";
import { saveImage } from "../images";
import { storage } from "../storage";
import { runDailyJobs, runTasks } from ".";
import {
  cleanExpired,
  cleanRateLimits,
  deleteUnconfirmedAccounts,
  purgeDeletedWishes,
  reconcileVotes,
  removeUnusedImages,
} from "./tasks";

const DAY_MS = 24 * 60 * 60 * 1000;
const NOW = new Date();
const ago = (days: number) => new Date(NOW.getTime() - days * DAY_MS);

async function person(values: Partial<typeof user.$inferInsert> = {}) {
  const id = randomUUID().slice(0, 6);
  const [row] = await db
    .insert(user)
    .values({
      nickname: `Person_${id}`,
      email: `person-${id}@example.com`,
      emailVerified: true,
      ...values,
    })
    .returning();
  return row!;
}

async function aGame() {
  const [game] = await db
    .insert(games)
    .values({ slug: `game-${randomUUID().slice(0, 6)}`, title: "G" })
    .returning();
  return game!;
}

async function aWish(
  gameId: string,
  values: Partial<typeof wishes.$inferInsert> = {},
) {
  const title = `Пожелание ${randomUUID().slice(0, 6)}`;
  const [row] = await db
    .insert(wishes)
    .values({ gameId, type: "add", title, titleNormalized: title, ...values })
    .returning();
  return row!;
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("daily jobs", () => {
  it("purge wishes deleted 30 days ago with their votes, and no others", async () => {
    const game = await aGame();
    const voter = await person();
    const old = await aWish(game.id, { deletedAt: ago(31) });
    const recent = await aWish(game.id, { deletedAt: ago(29) });
    const alive = await aWish(game.id, { mergedIntoId: old.id });
    await db.insert(votes).values({ wishId: old.id, userId: voter.id });

    expect(await purgeDeletedWishes(NOW)).toBe(1);

    const left = await db.select({ id: wishes.id }).from(wishes);
    expect(left.map((row) => row.id).sort()).toEqual(
      [recent.id, alive.id].sort(),
    );
    expect(await db.$count(votes)).toBe(0);
    const [merged] = await db
      .select({ mergedIntoId: wishes.mergedIntoId })
      .from(wishes)
      .where(eq(wishes.id, alive.id));
    expect(merged!.mergedIntoId).toBeNull();
  });

  it("delete accounts unconfirmed for 7 days, and free their nicknames", async () => {
    const stale = await person({
      emailVerified: false,
      createdAt: ago(8),
      nickname: "Forgotten",
    });
    await person({ emailVerified: false, createdAt: ago(6) });
    await person({ createdAt: ago(100) });
    await person({ emailVerified: false, createdAt: ago(30), role: "admin" });
    await db.insert(session).values({
      userId: stale.id,
      token: randomUUID(),
      expiresAt: new Date(NOW.getTime() + DAY_MS),
    });

    expect(await deleteUnconfirmedAccounts(NOW)).toBe(1);

    expect(await db.$count(user)).toBe(3);
    expect(await db.$count(session)).toBe(0);
    await expect(person({ nickname: "Forgotten" })).resolves.toBeTruthy();
  });

  it("remove limit windows older than two days", async () => {
    await db.insert(rateLimits).values([
      { key: "api:1.2.3.4", windowStart: ago(3), count: 5 },
      { key: "api:1.2.3.4", windowStart: ago(0.5), count: 5 },
      { key: "lock:signIn:x", windowStart: new Date(NOW.getTime() - 60_000) },
    ]);
    expect(await cleanRateLimits(NOW)).toBe(1);
    expect(await db.$count(rateLimits)).toBe(2);
  });

  it("remove expired sessions and one-time links", async () => {
    const someone = await person();
    await db.insert(session).values([
      { userId: someone.id, token: randomUUID(), expiresAt: ago(1) },
      { userId: someone.id, token: randomUUID(), expiresAt: ago(-1) },
    ]);
    await db.insert(verification).values([
      { identifier: "a", value: "x", expiresAt: ago(1) },
      { identifier: "b", value: "y", expiresAt: ago(-1) },
    ]);
    expect(await cleanExpired(NOW)).toBe(2);
    expect(await db.$count(session)).toBe(1);
    expect(await db.$count(verification)).toBe(1);
  });

  it("fix a counter that differs from the votes, and log it", async () => {
    const game = await aGame();
    const voter = await person();
    const right = await aWish(game.id, { votesCount: 1 });
    const wrong = await aWish(game.id, { votesCount: 7 });
    await db.insert(votes).values([
      { wishId: right.id, userId: voter.id },
      { wishId: wrong.id, userId: voter.id },
    ]);
    const log = vi.spyOn(console, "error").mockImplementation(() => {});

    expect(await reconcileVotes()).toBe(1);

    const counts = await db
      .select({ id: wishes.id, votesCount: wishes.votesCount })
      .from(wishes);
    expect(counts.every((row) => row.votesCount === 1)).toBe(true);
    expect(log).toHaveBeenCalledOnce();
    expect(String(log.mock.calls[0]![0])).toContain(wrong.id);
  });

  it("remove images nothing points to, after a day", async () => {
    // Clearly different colours: four different files, four hashes.
    const picture = (shade: number) =>
      sharp({
        create: {
          width: 8,
          height: 8,
          channels: 3,
          background: { r: shade * 60, g: 255 - shade * 60, b: 120 },
        },
      })
        .png()
        .toBuffer();
    const cover = await saveImage(await picture(1));
    const shot = await saveImage(await picture(2));
    const orphan = await saveImage(await picture(3));
    const fresh = await saveImage(await picture(4));
    for (const image of [cover, shot, orphan]) {
      const file = path.resolve(env.STORAGE_DIR, image.url.slice(1));
      await utimes(file, ago(2), ago(2));
    }
    await db.insert(games).values({
      slug: `game-${randomUUID().slice(0, 6)}`,
      title: "G",
      coverUrl: cover.url,
      screenshots: [{ url: shot.url, width: 8, height: 8, alt: "" }],
    });

    await removeUnusedImages(NOW);

    const left = new Set((await storage.list()).map((file) => file.url));
    expect(left.has(cover.url)).toBe(true);
    expect(left.has(shot.url)).toBe(true);
    expect(left.has(fresh.url)).toBe(true);
    expect(left.has(orphan.url)).toBe(false);
  });

  it("run one after another, a failed one does not stop the rest", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    const done: string[] = [];

    const report = await runTasks(
      [
        ["first", async () => (done.push("first"), 1)],
        [
          "broken",
          async () => {
            throw new Error("boom");
          },
        ],
        ["last", async () => (done.push("last"), 2)],
      ],
      NOW,
    );

    expect(done).toEqual(["first", "last"]);
    expect(report).toEqual([
      { task: "first", count: 1 },
      { task: "broken", error: "Error: boom" },
      { task: "last", count: 2 },
    ]);
    expect(log).toHaveBeenCalledOnce();
  });

  it("skip a run while another one holds the lock", async () => {
    const client = await db.$client.connect();
    try {
      await client.query("select pg_advisory_lock(4829301)");
      expect(await runDailyJobs(NOW)).toBeNull();
    } finally {
      await client.query("select pg_advisory_unlock(4829301)");
      client.release();
    }
    expect(await runDailyJobs(NOW)).toHaveLength(6);
  });
});
