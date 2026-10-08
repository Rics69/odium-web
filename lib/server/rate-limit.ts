import "server-only";
import { and, desc, eq, gt, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { rateLimits } from "@/lib/db/schema";
import { limits, locks, type LimitName, type LockName } from "./limits";

export type RateLimitResult =
  | { allowed: true; remaining: number }
  | { allowed: false; retryAfterSeconds: number };

/**
 * Counts one request of `subject` (an IP, a user id…) against a limit.
 * The counter grows in a single INSERT … ON CONFLICT DO UPDATE, so parallel
 * requests can never slip past it. Refused requests are counted too, but the
 * window still ends on time.
 */
export async function hitRateLimit(
  name: LimitName,
  subject: string,
  now: Date = new Date(),
): Promise<RateLimitResult> {
  const { max, windowSeconds } = limits[name];
  const windowMs = windowSeconds * 1000;
  const windowStart = Math.floor(now.getTime() / windowMs) * windowMs;

  const [row] = await db
    .insert(rateLimits)
    .values({
      key: `${name}:${subject}`,
      windowStart: new Date(windowStart),
      count: 1,
    })
    .onConflictDoUpdate({
      target: [rateLimits.key, rateLimits.windowStart],
      set: { count: sql`${rateLimits.count} + 1` },
    })
    .returning({ count: rateLimits.count });

  const count = row!.count;
  if (count <= max) {
    return { allowed: true, remaining: max - count };
  }
  const msLeft = windowStart + windowMs - now.getTime();
  return {
    allowed: false,
    retryAfterSeconds: Math.max(1, Math.ceil(msLeft / 1000)),
  };
}

/** Forgets a subject's counts: a successful sign-in clears its failures. */
export async function resetRateLimit(
  name: LimitName,
  subject: string,
): Promise<void> {
  await db.delete(rateLimits).where(eq(rateLimits.key, `${name}:${subject}`));
}

// A lock is a row in the same table whose window starts when the lock does
// (not on a whole minute), so the daily clean-up of old windows removes it
// too.

/** Locks a subject out for the lock's time, from now. */
export async function lock(
  name: LockName,
  subject: string,
  now: Date = new Date(),
): Promise<void> {
  await db
    .insert(rateLimits)
    .values({ key: `lock:${name}:${subject}`, windowStart: now, count: 1 })
    .onConflictDoNothing();
}

/** Seconds left of a subject's lock; 0 when it is free. */
export async function lockSecondsLeft(
  name: LockName,
  subject: string,
  now: Date = new Date(),
): Promise<number> {
  const lockMs = locks[name] * 1000;
  const [latest] = await db
    .select({ windowStart: rateLimits.windowStart })
    .from(rateLimits)
    .where(
      and(
        eq(rateLimits.key, `lock:${name}:${subject}`),
        gt(rateLimits.windowStart, new Date(now.getTime() - lockMs)),
      ),
    )
    .orderBy(desc(rateLimits.windowStart))
    .limit(1);
  if (!latest) return 0;
  const msLeft = latest.windowStart.getTime() + lockMs - now.getTime();
  return Math.max(1, Math.ceil(msLeft / 1000));
}
