import "server-only";
import { and, eq, isNull } from "drizzle-orm";
import { db } from "@/lib/db";
import { games, stopWords, votes, wishes } from "@/lib/db/schema";
import { t } from "@/lib/i18n";
import type { WishInput } from "@/lib/validation/wishes";
import { findStopWord, normalizeTitle } from "@/lib/wishes";
import { ApiError } from "./http";
import type { LimitName } from "./limits";
import { hitRateLimit } from "./rate-limit";
import type { CurrentUser } from "./session";

const DAY_MS = 24 * 60 * 60 * 1000;

/** What the API gives about a wish (the board, the wish page, the forms). */
export type WishView = {
  id: string;
  gameId: string;
  type: "add" | "remove";
  title: string;
  body: string;
  status: "new" | "review" | "planned" | "in_progress" | "done" | "declined";
  studioReply: string | null;
  doneVersion: string | null;
  votesCount: number;
  votedByMe: boolean;
  hidden: boolean;
  author: { nickname: string } | null;
  createdAt: string;
};

function isUniqueViolation(error: unknown): boolean {
  const code = (value: unknown) =>
    typeof value === "object" && value !== null && "code" in value
      ? (value as { code: unknown }).code
      : undefined;
  return (
    code(error) === "23505" ||
    (error instanceof Error && code(error.cause) === "23505")
  );
}

const duplicate = () =>
  new ApiError("DUPLICATE_WISH", {
    fields: { title: t("wishes.errors.duplicate") },
  });

/**
 * New wishes per player (spec, section 7): 5 an hour and 20 a day, and 2 a
 * day for an account younger than a day. Admins have no limits.
 */
async function checkWishLimits(user: CurrentUser) {
  if (user.role === "admin") return;
  const rules: LimitName[] = ["wishPerHour", "wishPerDay"];
  if (Date.now() - user.createdAt.getTime() < DAY_MS) {
    rules.push("wishPerDayNewAccount");
  }
  for (const rule of rules) {
    const limit = await hitRateLimit(rule, user.id);
    if (!limit.allowed) {
      throw new ApiError("RATE_LIMITED", {
        retryAfterSeconds: limit.retryAfterSeconds,
      });
    }
  }
}

/**
 * Creates a wish on a game's board (spec, section 5). The caller has made
 * sure the player is signed in with a confirmed email. The game must be
 * published and its board open; the same title from the same player is a
 * duplicate. Only a wish that passes these counts against the limits. A
 * stop word hides it until an admin looks. The author votes for it at once,
 * in the same transaction.
 */
export async function createWish(
  user: CurrentUser,
  slug: string,
  input: WishInput,
): Promise<WishView> {
  const [game] = await db
    .select({ id: games.id, wishesOpen: games.wishesOpen })
    .from(games)
    .where(and(eq(games.slug, slug), eq(games.published, true)));
  if (!game) throw new ApiError("NOT_FOUND");
  if (!game.wishesOpen) throw new ApiError("WISHES_CLOSED");

  const titleNormalized = normalizeTitle(input.title);
  const [same] = await db
    .select({ id: wishes.id })
    .from(wishes)
    .where(
      and(
        eq(wishes.authorId, user.id),
        eq(wishes.gameId, game.id),
        eq(wishes.titleNormalized, titleNormalized),
        isNull(wishes.deletedAt),
      ),
    );
  if (same) throw duplicate();

  await checkWishLimits(user);

  const words = await db.select({ word: stopWords.word }).from(stopWords);
  const flagged =
    findStopWord(
      `${input.title} ${input.body}`,
      words.map((row) => row.word),
    ) !== null;

  try {
    const wish = await db.transaction(async (tx) => {
      const [row] = await tx
        .insert(wishes)
        .values({
          gameId: game.id,
          authorId: user.id,
          type: input.type,
          title: input.title,
          titleNormalized,
          body: input.body,
          votesCount: 1,
          hidden: flagged,
          hiddenReason: flagged ? "flagged" : null,
        })
        .returning();
      await tx.insert(votes).values({ wishId: row!.id, userId: user.id });
      return row!;
    });
    return {
      id: wish.id,
      gameId: wish.gameId,
      type: wish.type,
      title: wish.title,
      body: wish.body,
      status: wish.status,
      studioReply: wish.studioReply,
      doneVersion: wish.doneVersion,
      votesCount: wish.votesCount,
      votedByMe: true,
      hidden: wish.hidden,
      author: { nickname: user.nickname },
      createdAt: wish.createdAt.toISOString(),
    };
  } catch (error) {
    // The same wish sent twice at once: the unique index let one through.
    if (isUniqueViolation(error)) throw duplicate();
    throw error;
  }
}
