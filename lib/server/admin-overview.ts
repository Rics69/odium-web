import "server-only";
import { and, eq, isNull } from "drizzle-orm";
import { db } from "@/lib/db";
import { games, user, wishes } from "@/lib/db/schema";

/** The admin's first screen: what waits for a look, and how big the site is. */
export async function adminOverview() {
  const [flagged, fresh, players, verified, allGames, published] =
    await Promise.all([
      db.$count(
        wishes,
        and(
          eq(wishes.hidden, true),
          eq(wishes.hiddenReason, "flagged"),
          isNull(wishes.deletedAt),
        ),
      ),
      db.$count(
        wishes,
        and(
          eq(wishes.status, "new"),
          eq(wishes.hidden, false),
          isNull(wishes.deletedAt),
        ),
      ),
      db.$count(user),
      db.$count(user, eq(user.emailVerified, true)),
      db.$count(games),
      db.$count(games, eq(games.published, true)),
    ]);
  return { flagged, fresh, players, verified, allGames, published };
}
