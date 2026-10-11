import "server-only";
import { and, desc, eq, sql, type SQL } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import type { AdminActionName, AdminTarget } from "@/lib/admin-actions";
import { db } from "@/lib/db";
import { adminLog, games, user, wishes } from "@/lib/db/schema";
import type { JournalQuery } from "@/lib/validation/admin-log";
import { decodeCursor, encodeCursor, PAGE_SIZE } from "./board";

export type JournalEntry = {
  id: string;
  action: AdminActionName;
  targetType: AdminTarget;
  targetId: string;
  /** What the object is called now, if it still exists. */
  targetTitle: string | null;
  /** Where to look at it, if anywhere. */
  targetHref: string | null;
  admin: { id: string; nickname: string } | null;
  before: Record<string, unknown> | null;
  after: Record<string, unknown> | null;
  reason: string | null;
  createdAt: string;
};

export type JournalPage = {
  entries: JournalEntry[];
  nextCursor: string | null;
};

const admins = alias(user, "admins");
const targetUsers = alias(user, "target_users");
const wishGames = alias(games, "wish_games");

/**
 * The admin journal (spec, section 6): every action, newest first, 20 a
 * page, filtered by admin, action, kind of object or one object. Each entry
 * comes with what its object is called now and where it lives.
 */
export async function listJournal(query: JournalQuery): Promise<JournalPage> {
  const conditions: (SQL | undefined)[] = [];
  if (query.admin) conditions.push(eq(adminLog.adminId, query.admin));
  if (query.action) conditions.push(eq(adminLog.action, query.action));
  if (query.type) conditions.push(eq(adminLog.targetType, query.type));
  if (query.target) conditions.push(eq(adminLog.targetId, query.target));
  if (query.cursor) {
    const [, createdAt, id] = decodeCursor(query.cursor, "new");
    conditions.push(
      sql`(${adminLog.createdAt}, ${adminLog.id}) < (${createdAt}::timestamptz, ${id}::uuid)`,
    );
  }

  // target_id is text: a uuid for wishes, players and games, a name for
  // the studio and the lists.
  const rows = await db
    .select({
      entry: adminLog,
      adminNickname: admins.nickname,
      wishTitle: wishes.title,
      wishGameSlug: wishGames.slug,
      wishDeleted: sql<boolean>`${wishes.deletedAt} is not null`,
      userNickname: targetUsers.nickname,
      gameTitle: games.title,
      createdAtText: sql<string>`${adminLog.createdAt}::text`,
    })
    .from(adminLog)
    .leftJoin(admins, eq(admins.id, adminLog.adminId))
    .leftJoin(
      wishes,
      and(
        eq(adminLog.targetType, "wish"),
        sql`${wishes.id}::text = ${adminLog.targetId}`,
      ),
    )
    .leftJoin(wishGames, eq(wishGames.id, wishes.gameId))
    .leftJoin(
      targetUsers,
      and(
        eq(adminLog.targetType, "user"),
        sql`${targetUsers.id}::text = ${adminLog.targetId}`,
      ),
    )
    .leftJoin(
      games,
      and(
        eq(adminLog.targetType, "game"),
        sql`${games.id}::text = ${adminLog.targetId}`,
      ),
    )
    .where(and(...conditions))
    .orderBy(desc(adminLog.createdAt), desc(adminLog.id))
    .limit(PAGE_SIZE + 1);

  const page = rows.slice(0, PAGE_SIZE);
  const last = page.at(-1);
  return {
    entries: page.map((row) => {
      const { entry } = row;
      const type = entry.targetType as AdminTarget;
      const target = targetOf(type, entry.targetId, row);
      return {
        id: entry.id,
        action: entry.action as AdminActionName,
        targetType: type,
        targetId: entry.targetId,
        targetTitle: target.title,
        targetHref: target.href,
        admin:
          entry.adminId && row.adminNickname !== null
            ? { id: entry.adminId, nickname: row.adminNickname }
            : null,
        before: entry.before as Record<string, unknown> | null,
        after: entry.after as Record<string, unknown> | null,
        reason: entry.reason,
        createdAt: entry.createdAt.toISOString(),
      };
    }),
    nextCursor:
      rows.length > PAGE_SIZE && last
        ? encodeCursor(["new", last.createdAtText, last.entry.id])
        : null,
  };
}

function targetOf(
  type: AdminTarget,
  id: string,
  row: {
    wishTitle: string | null;
    wishGameSlug: string | null;
    wishDeleted: boolean;
    userNickname: string | null;
    gameTitle: string | null;
  },
): { title: string | null; href: string | null } {
  switch (type) {
    case "wish":
      return {
        title: row.wishTitle,
        // A deleted wish has no page left to open.
        href:
          row.wishGameSlug && !row.wishDeleted
            ? `/games/${row.wishGameSlug}/wishes/${id}`
            : null,
      };
    case "user":
      return {
        title: row.userNickname,
        href: row.userNickname !== null ? `/admin/users/${id}` : null,
      };
    case "game":
      return {
        title: row.gameTitle,
        href: row.gameTitle !== null ? `/admin/games/${id}` : null,
      };
    case "studio":
      return { title: null, href: "/admin/studio" };
    case "stop_words":
    case "blocked_domains":
      return { title: null, href: "/admin/lists" };
  }
}

/** Admins who have done anything: the "who" filter. */
export async function listJournalAdmins() {
  return db
    .selectDistinct({ id: user.id, nickname: user.nickname })
    .from(adminLog)
    .innerJoin(user, eq(user.id, adminLog.adminId))
    .orderBy(user.nickname);
}
