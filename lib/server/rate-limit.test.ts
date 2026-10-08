import { describe, expect, it } from "vitest";
import { db } from "@/lib/db";
import { rateLimits } from "@/lib/db/schema";
import { limits } from "./limits";
import {
  hitRateLimit,
  lock,
  lockSecondsLeft,
  resetRateLimit,
} from "./rate-limit";

// The vote limit: 60 a minute.
const { max } = limits.vote;
const at = (time: string) => new Date(`2026-10-08T${time}Z`);

async function hitTimes(times: number, subject: string, now: Date) {
  const results = [];
  for (let i = 0; i < times; i++) {
    results.push(await hitRateLimit("vote", subject, now));
  }
  return results;
}

describe("rate limits", () => {
  it("lets requests through up to the limit and counts what is left", async () => {
    const results = await hitTimes(max, "user-1", at("12:00:10"));

    expect(results[0]).toEqual({ allowed: true, remaining: max - 1 });
    expect(results.at(-1)).toEqual({ allowed: true, remaining: 0 });
  });

  it("refuses the next one until the window ends", async () => {
    await hitTimes(max, "user-1", at("12:00:10"));

    expect(await hitRateLimit("vote", "user-1", at("12:00:15"))).toEqual({
      allowed: false,
      retryAfterSeconds: 45,
    });
    // Still refused: refused requests do not move the window.
    expect(await hitRateLimit("vote", "user-1", at("12:00:59.5"))).toEqual({
      allowed: false,
      retryAfterSeconds: 1,
    });
    expect(await hitRateLimit("vote", "user-1", at("12:01:00"))).toEqual({
      allowed: true,
      remaining: max - 1,
    });
  });

  it("keeps separate counters per subject and per limit", async () => {
    await hitTimes(max + 1, "user-1", at("12:00:10"));

    expect(await hitRateLimit("vote", "user-2", at("12:00:10"))).toMatchObject({
      allowed: true,
    });
    expect(await hitRateLimit("wishEdit", "user-1", at("12:00:10"))).toEqual({
      allowed: true,
      remaining: limits.wishEdit.max - 1,
    });
  });

  it("aligns windows to whole minutes, hours and days", async () => {
    await hitRateLimit("vote", "user-1", at("12:34:56"));
    await hitRateLimit("wishEdit", "user-1", at("12:34:56"));
    await hitRateLimit("wishPerDay", "user-1", at("12:34:56"));

    const rows = await db
      .select({ key: rateLimits.key, windowStart: rateLimits.windowStart })
      .from(rateLimits)
      .orderBy(rateLimits.key);
    expect(rows).toEqual([
      { key: "vote:user-1", windowStart: at("12:34:00") },
      { key: "wishEdit:user-1", windowStart: at("12:00:00") },
      { key: "wishPerDay:user-1", windowStart: at("00:00:00") },
    ]);
  });

  it("lets exactly the limit through when requests arrive at once", async () => {
    const now = at("12:00:10");
    const results = await Promise.all(
      Array.from({ length: max + 40 }, () =>
        hitRateLimit("vote", "user-1", now),
      ),
    );

    expect(results.filter((result) => result.allowed)).toHaveLength(max);
    const [row] = await db.select().from(rateLimits);
    expect(row?.count).toBe(max + 40);
  });
});

describe("locks", () => {
  it("hold for their whole time from the moment they start", async () => {
    await lock("signIn", "203.0.113.5|pixel@example.com", at("12:14:30"));

    expect(
      await lockSecondsLeft(
        "signIn",
        "203.0.113.5|pixel@example.com",
        at("12:14:30"),
      ),
    ).toBe(15 * 60);
    expect(
      await lockSecondsLeft(
        "signIn",
        "203.0.113.5|pixel@example.com",
        at("12:29:00"),
      ),
    ).toBe(30);
    expect(
      await lockSecondsLeft(
        "signIn",
        "203.0.113.5|pixel@example.com",
        at("12:29:30"),
      ),
    ).toBe(0);
  });

  it("belong to one subject", async () => {
    await lock("signIn", "a", at("12:00:00"));
    expect(await lockSecondsLeft("signIn", "b", at("12:00:01"))).toBe(0);
  });
});

describe("resetting a limit", () => {
  it("forgets the subject's counts and only them", async () => {
    await hitTimes(max, "user-1", at("12:00:10"));
    await hitTimes(max, "user-2", at("12:00:10"));

    await resetRateLimit("vote", "user-1");

    expect(await hitRateLimit("vote", "user-1", at("12:00:20"))).toEqual({
      allowed: true,
      remaining: max - 1,
    });
    expect(await hitRateLimit("vote", "user-2", at("12:00:20"))).toMatchObject({
      allowed: false,
    });
  });
});
