import "server-only";
import { and, eq, inArray, isNull, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { games, votes, wishes } from "@/lib/db/schema";
import { ApiError } from "./http";
import { hitRateLimit } from "./rate-limit";
import type { CurrentUser } from "./session";

type Executor = Pick<typeof db, "update">;

/**
 * Sets `votes_count` of the given wishes to the real number of votes, for
 * changes of many votes at once (a deleted account). A vote at the same
 * moment may be missed; the daily check (step 4.8) puts it right.
 */
export async function recountVotes(tx: Executor, wishIds: string[]) {
  if (wishIds.length === 0) return;
  await tx
    .update(wishes)
    .set({
      votesCount: sql`(select count(*) from ${votes} where ${votes.wishId} = ${wishes.id})::int`,
    })
    .where(inArray(wishes.id, wishIds));
}

/**
 * Puts the player's vote on a wish (on: true) or takes it back (spec,
 * section 5). The vote row and the counter change in one transaction: the
 * counter moves by one only when a row was really added or removed, and the
 * UPDATE locks the wish, so votes at once queue up and the counter always
 * equals the votes. Asking twice changes nothing. Hidden and deleted wishes
 * are not there for voting; done and declined ones keep their votes as they
 * are. 60 votes a minute per player.
 */
export async function setVote(
  user: CurrentUser,
  wishId: string,
  on: boolean,
): Promise<{ votesCount: number; votedByMe: boolean }> {
  const [wish] = await db
    .select({ status: wishes.status })
    .from(wishes)
    .innerJoin(games, eq(games.id, wishes.gameId))
    .where(
      and(
        eq(wishes.id, wishId),
        eq(wishes.hidden, false),
        isNull(wishes.deletedAt),
        eq(games.published, true),
      ),
    );
  if (!wish) throw new ApiError("NOT_FOUND");
  if (wish.status === "done" || wish.status === "declined") {
    throw new ApiError("VOTING_CLOSED");
  }

  const limit = await hitRateLimit("vote", user.id);
  if (!limit.allowed) {
    throw new ApiError("RATE_LIMITED", {
      retryAfterSeconds: limit.retryAfterSeconds,
    });
  }

  return db.transaction(async (tx) => {
    const changed = on
      ? await tx
          .insert(votes)
          .values({ wishId, userId: user.id })
          .onConflictDoNothing()
          .returning({ wishId: votes.wishId })
      : await tx
          .delete(votes)
          .where(and(eq(votes.wishId, wishId), eq(votes.userId, user.id)))
          .returning({ wishId: votes.wishId });
    const [row] = await tx
      .update(wishes)
      .set({
        votesCount: sql`${wishes.votesCount} + ${changed.length === 0 ? 0 : on ? 1 : -1}`,
      })
      // Checked again under the lock: a wish hidden or merged since the
      // check above takes no vote, and the vote row goes back with it.
      .where(
        and(
          eq(wishes.id, wishId),
          eq(wishes.hidden, false),
          isNull(wishes.deletedAt),
        ),
      )
      .returning({ votesCount: wishes.votesCount });
    if (!row) throw new ApiError("NOT_FOUND");
    return { votesCount: row.votesCount, votedByMe: on };
  });
}
