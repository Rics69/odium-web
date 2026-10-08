import "server-only";
import { sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { rateLimits } from "@/lib/db/schema";
import { limits, type LimitName } from "./limits";

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
