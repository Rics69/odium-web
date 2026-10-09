import "server-only";
import { inArray, sql } from "drizzle-orm";
import type { db } from "@/lib/db";
import { votes, wishes } from "@/lib/db/schema";

type Executor = Pick<typeof db, "update">;

/**
 * Sets `votes_count` of the given wishes to the real number of votes.
 * Called in the same transaction as the change of `votes` (spec, section 8).
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
