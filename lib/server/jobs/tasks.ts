import "server-only";
import { and, eq, lt, ne, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  games,
  rateLimits,
  session,
  studioInfo,
  user,
  verification,
  votes,
  wishes,
} from "@/lib/db/schema";
import { storage } from "../storage";

const DAY_MS = 24 * 60 * 60 * 1000;
const daysBefore = (now: Date, days: number) =>
  new Date(now.getTime() - days * DAY_MS);

/**
 * Wishes deleted 30 days ago and more go for good, with their votes
 * (spec, section 5). A duplicate merged into one of them keeps standing.
 */
export async function purgeDeletedWishes(now: Date): Promise<number> {
  const gone = await db
    .delete(wishes)
    .where(lt(wishes.deletedAt, daysBefore(now, 30)))
    .returning({ id: wishes.id });
  return gone.length;
}

/**
 * Accounts that never confirmed their email within 7 days go, and their
 * nicknames are free again (spec, section 7). Such an account could not
 * post or vote, so nothing else goes with it. Admins are never touched.
 */
export async function deleteUnconfirmedAccounts(now: Date): Promise<number> {
  const gone = await db
    .delete(user)
    .where(
      and(
        eq(user.emailVerified, false),
        lt(user.createdAt, daysBefore(now, 7)),
        ne(user.role, "admin"),
      ),
    )
    .returning({ id: user.id });
  return gone.length;
}

/**
 * Old windows of the limits (spec, section 7). The longest window is a
 * day; the 15-minute sign-in locks are long over after two.
 */
export async function cleanRateLimits(now: Date): Promise<number> {
  const gone = await db
    .delete(rateLimits)
    .where(lt(rateLimits.windowStart, daysBefore(now, 2)))
    .returning({ key: rateLimits.key });
  return gone.length;
}

/** Sessions and one-time links that have run out. */
export async function cleanExpired(now: Date): Promise<number> {
  const sessions = await db
    .delete(session)
    .where(lt(session.expiresAt, now))
    .returning({ id: session.id });
  const links = await db
    .delete(verification)
    .where(lt(verification.expiresAt, now))
    .returning({ id: verification.id });
  return sessions.length + links.length;
}

/**
 * Puts every counter right where it differs from the votes (spec, section
 * 8). It should never happen: each fix goes to the error log, with the
 * wish, so the cause can be found.
 */
export async function reconcileVotes(): Promise<number> {
  const fixed = await db.execute<{
    id: string;
    was: number;
    now: number;
  }>(sql`
    update ${wishes} w
    set votes_count = counted.n
    from (
      select w2.id, w2.votes_count as was, count(v.wish_id)::int as n
      from ${wishes} w2
      left join ${votes} v on v.wish_id = w2.id
      group by w2.id
    ) counted
    where counted.id = w.id and counted.was <> counted.n
    returning w.id, counted.was, counted.n as now
  `);
  for (const row of fixed.rows) {
    console.error(
      `votes_count of wish ${row.id} was ${row.was}, the votes are ${row.now}: fixed`,
    );
  }
  return fixed.rows.length;
}

/**
 * Uploaded images nothing points to any more: a replaced cover, a removed
 * screenshot, a deleted game. A file is left a day first: it may belong to
 * a form not saved yet.
 */
export async function removeUnusedImages(now: Date): Promise<number> {
  const used = new Set<string>();
  const rows = await db
    .select({ cover: games.coverUrl, screenshots: games.screenshots })
    .from(games);
  for (const row of rows) {
    if (row.cover) used.add(row.cover);
    for (const shot of row.screenshots) used.add(shot.url);
  }
  const [studio] = await db.select({ team: studioInfo.team }).from(studioInfo);
  for (const member of studio?.team ?? []) {
    if (member.photoUrl) used.add(member.photoUrl);
  }

  let removed = 0;
  for (const file of await storage.list()) {
    if (used.has(file.url) || file.savedAt > daysBefore(now, 1)) continue;
    await storage.remove(file.name);
    removed++;
  }
  return removed;
}
