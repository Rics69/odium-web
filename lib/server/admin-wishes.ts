import "server-only";
import {
  and,
  asc,
  desc,
  eq,
  ilike,
  inArray,
  isNull,
  ne,
  or,
  sql,
  type SQL,
} from "drizzle-orm";
import { db } from "@/lib/db";
import { games, user, wishes } from "@/lib/db/schema";
import { t } from "@/lib/i18n";
import type {
  AdminWishBulk,
  AdminWishPatch,
  AdminWishesQuery,
} from "@/lib/validation/admin-wishes";
import { normalizeTitle } from "@/lib/wishes";
import {
  adminAction,
  type AdminTransaction,
  type RecordAction,
} from "./admin-log";
import { decodeCursor, encodeCursor, PAGE_SIZE } from "./board";
import { ApiError } from "./http";
import type { CurrentUser } from "./session";
import { isUniqueViolation } from "./wishes";

type WishRow = typeof wishes.$inferSelect;

/** A wish as the moderator sees it: everything, hidden ones included. */
export type AdminWish = {
  id: string;
  game: { id: string; slug: string; title: string };
  type: WishRow["type"];
  title: string;
  body: string;
  status: WishRow["status"];
  studioReply: string | null;
  doneVersion: string | null;
  votesCount: number;
  hidden: boolean;
  hiddenReason: WishRow["hiddenReason"];
  mergedIntoId: string | null;
  author: { id: string; nickname: string } | null;
  createdAt: string;
  updatedAt: string;
};

export type AdminWishesPage = {
  wishes: AdminWish[];
  nextCursor: string | null;
};

/** % and _ in a search are letters, not patterns. */
const likePattern = (text: string) =>
  `%${text.replace(/[\\%_]/g, (char) => `\\${char}`)}%`;

function selectAdminWishes() {
  return db
    .select({
      wish: wishes,
      game: { id: games.id, slug: games.slug, title: games.title },
      authorNickname: user.nickname,
      createdAtText: sql<string>`${wishes.createdAt}::text`,
    })
    .from(wishes)
    .innerJoin(games, eq(games.id, wishes.gameId))
    .leftJoin(user, eq(user.id, wishes.authorId))
    .$dynamic();
}

type AdminRow = Awaited<ReturnType<typeof selectAdminWishes>>[number];

function toAdminWish({ wish, game, authorNickname }: AdminRow): AdminWish {
  return {
    id: wish.id,
    game,
    type: wish.type,
    title: wish.title,
    body: wish.body,
    status: wish.status,
    studioReply: wish.studioReply,
    doneVersion: wish.doneVersion,
    votesCount: wish.votesCount,
    hidden: wish.hidden,
    hiddenReason: wish.hiddenReason,
    mergedIntoId: wish.mergedIntoId,
    author:
      wish.authorId && authorNickname !== null
        ? { id: wish.authorId, nickname: authorNickname }
        : null,
    createdAt: wish.createdAt.toISOString(),
    updatedAt: wish.updatedAt.toISOString(),
  };
}

/**
 * The moderation table (spec, section 6): wishes of every game, hidden ones
 * too, with filters, 20 a page. Deleted wishes are gone for the admin as
 * well.
 */
export async function listAdminWishes(
  query: AdminWishesQuery,
): Promise<AdminWishesPage> {
  const conditions: (SQL | undefined)[] = [isNull(wishes.deletedAt)];
  if (query.game) conditions.push(eq(games.slug, query.game));
  if (query.status) conditions.push(eq(wishes.status, query.status));
  if (query.type) conditions.push(eq(wishes.type, query.type));
  switch (query.visibility) {
    case "visible":
      conditions.push(eq(wishes.hidden, false));
      break;
    case "hidden":
      conditions.push(eq(wishes.hidden, true));
      break;
    case "review":
      conditions.push(
        eq(wishes.hidden, true),
        eq(wishes.hiddenReason, "flagged"),
      );
      break;
  }
  if (query.author) {
    conditions.push(ilike(user.nickname, likePattern(query.author)));
  }
  if (query.q) {
    const pattern = likePattern(query.q);
    conditions.push(
      or(ilike(wishes.title, pattern), ilike(wishes.body, pattern)),
    );
  }

  if (query.cursor) {
    const cursor = decodeCursor(query.cursor, query.sort);
    switch (cursor[0]) {
      case "top":
        conditions.push(
          sql`(${wishes.votesCount}, ${wishes.createdAt}, ${wishes.id}) < (${cursor[1]}, ${cursor[2]}::timestamptz, ${cursor[3]}::uuid)`,
        );
        break;
      case "new":
        conditions.push(
          sql`(${wishes.createdAt}, ${wishes.id}) < (${cursor[1]}::timestamptz, ${cursor[2]}::uuid)`,
        );
        break;
      case "old":
        conditions.push(
          sql`(${wishes.createdAt}, ${wishes.id}) > (${cursor[1]}::timestamptz, ${cursor[2]}::uuid)`,
        );
        break;
    }
  }

  const order = {
    top: [desc(wishes.votesCount), desc(wishes.createdAt), desc(wishes.id)],
    new: [desc(wishes.createdAt), desc(wishes.id)],
    old: [asc(wishes.createdAt), asc(wishes.id)],
  }[query.sort];

  const rows = await selectAdminWishes()
    .where(and(...conditions))
    .orderBy(...order)
    .limit(PAGE_SIZE + 1);

  const page = rows.slice(0, PAGE_SIZE);
  const last = page.at(-1);
  let nextCursor: string | null = null;
  if (rows.length > PAGE_SIZE && last) {
    nextCursor = encodeCursor(
      query.sort === "top"
        ? ["top", last.wish.votesCount, last.createdAtText, last.wish.id]
        : [query.sort, last.createdAtText, last.wish.id],
    );
  }
  return { wishes: page.map(toAdminWish), nextCursor };
}

/** Every game for the filter, unpublished ones too, in catalogue order. */
export function listGameChoices() {
  return db
    .select({ slug: games.slug, title: games.title })
    .from(games)
    .orderBy(asc(games.sortOrder), asc(games.title));
}

/** Wishes by id, not deleted, in no particular order. */
export async function getAdminWishes(ids: string[]): Promise<AdminWish[]> {
  if (ids.length === 0) return [];
  const rows = await selectAdminWishes().where(
    and(inArray(wishes.id, ids), isNull(wishes.deletedAt)),
  );
  return rows.map(toAdminWish);
}

/** The rows to change, locked until the transaction ends. */
async function lockWishes(tx: AdminTransaction, ids: string[]) {
  return tx
    .select()
    .from(wishes)
    .where(and(inArray(wishes.id, ids), isNull(wishes.deletedAt)))
    .for("update");
}

/**
 * Applies a moderator's change to one wish and records each kind of change
 * apart, so the journal can be filtered by it: status, reply, hide or show,
 * text. Returns whether anything changed.
 */
async function applyPatch(
  tx: AdminTransaction,
  record: RecordAction,
  wish: WishRow,
  patch: AdminWishPatch,
): Promise<boolean> {
  const target = { targetType: "wish" as const, targetId: wish.id };
  const set: Partial<typeof wishes.$inferInsert> = {};

  const status = patch.status ?? wish.status;
  const reply =
    patch.studioReply === undefined
      ? wish.studioReply
      : patch.studioReply || null;
  // A declined wish says why (spec, section 5).
  if (status === "declined" && !reply) {
    throw new ApiError("VALIDATION_ERROR", {
      fields: { studioReply: t("admin.wishes.errors.replyRequired") },
    });
  }
  const doneVersion =
    status !== "done"
      ? null
      : patch.doneVersion === undefined
        ? wish.doneVersion
        : patch.doneVersion || null;
  if (status !== wish.status || doneVersion !== wish.doneVersion) {
    set.status = status;
    set.doneVersion = doneVersion;
    await record({
      ...target,
      action: "wish.status",
      before: { status: wish.status, doneVersion: wish.doneVersion },
      after: { status, doneVersion },
    });
  }
  if (reply !== wish.studioReply) {
    set.studioReply = reply;
    await record({
      ...target,
      action: "wish.reply",
      before: { studioReply: wish.studioReply },
      after: { studioReply: reply },
    });
  }

  if (patch.hidden === true && patch.hiddenReason) {
    if (!wish.hidden || wish.hiddenReason !== patch.hiddenReason) {
      set.hidden = true;
      set.hiddenReason = patch.hiddenReason;
      await record({
        ...target,
        action: "wish.hide",
        before: { hidden: wish.hidden, hiddenReason: wish.hiddenReason },
        after: { hidden: true, hiddenReason: patch.hiddenReason },
        reason: patch.hiddenReason,
      });
    }
  } else if (patch.hidden === false && wish.hidden) {
    set.hidden = false;
    set.hiddenReason = null;
    await record({
      ...target,
      action: "wish.show",
      before: { hidden: true, hiddenReason: wish.hiddenReason },
      after: { hidden: false, hiddenReason: null },
    });
  }

  const text = patch.text;
  if (
    text &&
    (text.type !== wish.type ||
      text.title !== wish.title ||
      text.body !== wish.body)
  ) {
    const titleNormalized = normalizeTitle(text.title);
    if (wish.authorId && titleNormalized !== wish.titleNormalized) {
      const [same] = await tx
        .select({ id: wishes.id })
        .from(wishes)
        .where(
          and(
            eq(wishes.authorId, wish.authorId),
            eq(wishes.gameId, wish.gameId),
            eq(wishes.titleNormalized, titleNormalized),
            isNull(wishes.deletedAt),
            ne(wishes.id, wish.id),
          ),
        );
      if (same) throw duplicateOfAuthor();
    }
    Object.assign(set, { ...text, titleNormalized });
    await record({
      ...target,
      action: "wish.edit",
      before: { type: wish.type, title: wish.title, body: wish.body },
      after: { type: text.type, title: text.title, body: text.body },
    });
  }

  if (Object.keys(set).length === 0) return false;
  await tx.update(wishes).set(set).where(eq(wishes.id, wish.id));
  return true;
}

const duplicateOfAuthor = () =>
  new ApiError("DUPLICATE_WISH", {
    fields: { "text.title": t("admin.wishes.errors.duplicate") },
  });

/**
 * The moderator changes one wish: status (a declined one needs a reply),
 * the studio's reply, hidden with a reason or shown, the text. Every change
 * lands in the journal in the same transaction.
 */
export async function moderateWish(
  admin: Pick<CurrentUser, "id">,
  wishId: string,
  patch: AdminWishPatch,
): Promise<{ gameId: string; changed: boolean }> {
  try {
    return await adminAction(admin, async (tx, record) => {
      const [wish] = await lockWishes(tx, [wishId]);
      if (!wish) throw new ApiError("NOT_FOUND");
      const changed = await applyPatch(tx, record, wish, patch);
      return { gameId: wish.gameId, changed };
    });
  } catch (error) {
    // The same title saved at once by the author: the index let one in.
    if (isUniqueViolation(error)) throw duplicateOfAuthor();
    throw error;
  }
}

/**
 * Deletes a wish for good in 30 days (spec, section 6): it leaves the
 * boards and the admin at once, its votes stay until the daily clean-up.
 */
async function softDelete(
  tx: AdminTransaction,
  record: RecordAction,
  wish: WishRow,
) {
  await tx
    .update(wishes)
    .set({ deletedAt: new Date() })
    .where(eq(wishes.id, wish.id));
  await record({
    action: "wish.delete",
    targetType: "wish",
    targetId: wish.id,
    before: { title: wish.title, status: wish.status, hidden: wish.hidden },
  });
}

export async function deleteWishAsAdmin(
  admin: Pick<CurrentUser, "id">,
  wishId: string,
): Promise<{ gameId: string }> {
  return adminAction(admin, async (tx, record) => {
    const [wish] = await lockWishes(tx, [wishId]);
    if (!wish) throw new ApiError("NOT_FOUND");
    await softDelete(tx, record, wish);
    return { gameId: wish.gameId };
  });
}

/**
 * One action for the selected wishes, all or nothing: hide with a reason,
 * show, delete or set a status. Each changed wish gets its own journal
 * record. Ids that are gone are skipped.
 */
export async function moderateWishes(
  admin: Pick<CurrentUser, "id">,
  input: AdminWishBulk,
): Promise<{ changedIds: string[]; gameIds: string[] }> {
  return adminAction(admin, async (tx, record) => {
    const rows = await lockWishes(tx, input.ids);
    const changedIds: string[] = [];
    const gameIds = new Set<string>();
    for (const wish of rows) {
      let changed = true;
      if (input.action === "delete") {
        await softDelete(tx, record, wish);
      } else {
        const patch: AdminWishPatch =
          input.action === "hide"
            ? { hidden: true, hiddenReason: input.reason }
            : input.action === "show"
              ? { hidden: false }
              : {
                  status: input.status,
                  doneVersion: input.doneVersion,
                  studioReply: input.studioReply,
                };
        changed = await applyPatch(tx, record, wish, patch);
      }
      if (changed) {
        changedIds.push(wish.id);
        gameIds.add(wish.gameId);
      }
    }
    return { changedIds, gameIds: [...gameIds] };
  });
}
