import "server-only";
import { and, eq, isNull, ne } from "drizzle-orm";
import { db } from "@/lib/db";
import { games, stopWords, user, votes, wishes } from "@/lib/db/schema";
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

/** A stop word in the title or the description hides the wish for review. */
async function hasStopWord(input: { title: string; body: string }) {
  const words = await db.select({ word: stopWords.word }).from(stopWords);
  return (
    findStopWord(
      `${input.title} ${input.body}`,
      words.map((row) => row.word),
    ) !== null
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

  const flagged = await hasStopWord(input);

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

export const EDIT_WINDOW_MS = 15 * 60 * 1000;

/** The wish page: the wish, its game, and what this viewer may do with it. */
export type WishDetail = WishView & {
  game: { slug: string; title: string };
  /** Why it is hidden: only for its author and admins. */
  hiddenReason: (typeof wishes.$inferSelect)["hiddenReason"];
  mergedInto: { id: string; title: string } | null;
  /** Until when the author may edit it, or null. */
  editableUntil: string | null;
  canDelete: boolean;
};

const isNew = (wish: { status: string }) => wish.status === "new";

function editableUntil(wish: { status: string; createdAt: Date }) {
  const until = wish.createdAt.getTime() + EDIT_WINDOW_MS;
  return isNew(wish) && until > Date.now() ? new Date(until) : null;
}

/**
 * One wish as a viewer may see it (spec, section 5), or null. A hidden wish
 * is there for its author and admins only; a deleted one or one of an
 * unpublished game for nobody.
 */
export async function getWish(
  wishId: string,
  viewer: CurrentUser | null,
): Promise<WishDetail | null> {
  const [row] = await db
    .select({
      wish: wishes,
      author: user.nickname,
      game: { slug: games.slug, title: games.title },
    })
    .from(wishes)
    .innerJoin(games, eq(games.id, wishes.gameId))
    .leftJoin(user, eq(user.id, wishes.authorId))
    .where(
      and(
        eq(wishes.id, wishId),
        isNull(wishes.deletedAt),
        eq(games.published, true),
      ),
    );
  if (!row) return null;
  const { wish } = row;
  const isAuthor = viewer !== null && wish.authorId === viewer.id;
  const isAdmin = viewer?.role === "admin";
  if (wish.hidden && !isAuthor && !isAdmin) return null;

  const [vote] = viewer
    ? await db
        .select({ wishId: votes.wishId })
        .from(votes)
        .where(and(eq(votes.wishId, wish.id), eq(votes.userId, viewer.id)))
    : [];
  const [original] = wish.mergedIntoId
    ? await db
        .select({ id: wishes.id, title: wishes.title })
        .from(wishes)
        .where(and(eq(wishes.id, wish.mergedIntoId), isNull(wishes.deletedAt)))
    : [];
  const until = isAuthor ? editableUntil(wish) : null;

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
    votedByMe: Boolean(vote),
    hidden: wish.hidden,
    author: row.author === null ? null : { nickname: row.author },
    createdAt: wish.createdAt.toISOString(),
    game: row.game,
    hiddenReason: isAuthor || isAdmin ? wish.hiddenReason : null,
    mergedInto: original ?? null,
    editableUntil: until?.toISOString() ?? null,
    canDelete: isAuthor && isNew(wish),
  };
}

/** The author's own wish, not deleted, or 404 for anyone else. */
async function ownWish(user: CurrentUser, wishId: string) {
  const [wish] = await db
    .select()
    .from(wishes)
    .where(and(eq(wishes.id, wishId), isNull(wishes.deletedAt)));
  // Someone else's wish is not there for them to change.
  if (!wish || wish.authorId !== user.id) throw new ApiError("NOT_FOUND");
  return wish;
}

/**
 * The author edits a wish: within 15 minutes of posting and while it is
 * "new" (spec, section 3), 10 edits an hour. Same rules as a new wish: no
 * duplicate of another own wish, a stop word hides it for review. Admins
 * change wishes in the admin, where the log records it (step 4.2).
 */
export async function updateWish(
  user: CurrentUser,
  wishId: string,
  input: WishInput,
): Promise<{ gameId: string; hidden: boolean }> {
  const wish = await ownWish(user, wishId);
  if (!editableUntil(wish)) throw new ApiError("EDIT_CLOSED");

  const titleNormalized = normalizeTitle(input.title);
  const [same] = await db
    .select({ id: wishes.id })
    .from(wishes)
    .where(
      and(
        eq(wishes.authorId, user.id),
        eq(wishes.gameId, wish.gameId),
        eq(wishes.titleNormalized, titleNormalized),
        isNull(wishes.deletedAt),
        ne(wishes.id, wish.id),
      ),
    );
  if (same) throw duplicate();

  const limit = await hitRateLimit("wishEdit", user.id);
  if (!limit.allowed) {
    throw new ApiError("RATE_LIMITED", {
      retryAfterSeconds: limit.retryAfterSeconds,
    });
  }

  // A wish hidden by a moderator stays hidden whatever the new text.
  const flagged = await hasStopWord(input);
  const hidden = wish.hidden || flagged;
  try {
    await db
      .update(wishes)
      .set({
        type: input.type,
        title: input.title,
        titleNormalized,
        body: input.body,
        hidden,
        hiddenReason: wish.hidden
          ? wish.hiddenReason
          : flagged
            ? "flagged"
            : null,
      })
      .where(eq(wishes.id, wish.id));
  } catch (error) {
    if (isUniqueViolation(error)) throw duplicate();
    throw error;
  }
  return { gameId: wish.gameId, hidden };
}

/**
 * The author deletes a wish while it is "new": a soft delete, gone for
 * good after 30 days (step 4.8).
 */
export async function deleteWish(
  user: CurrentUser,
  wishId: string,
): Promise<{ gameId: string }> {
  const wish = await ownWish(user, wishId);
  if (!isNew(wish)) throw new ApiError("DELETE_CLOSED");
  await db
    .update(wishes)
    .set({ deletedAt: new Date() })
    .where(eq(wishes.id, wish.id));
  return { gameId: wish.gameId };
}
