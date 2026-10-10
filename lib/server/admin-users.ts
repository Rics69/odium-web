import "server-only";
import {
  and,
  desc,
  eq,
  ilike,
  inArray,
  isNull,
  like,
  or,
  sql,
  type SQL,
} from "drizzle-orm";
import { db } from "@/lib/db";
import { adminLog, games, session, user, votes, wishes } from "@/lib/db/schema";
import { t } from "@/lib/i18n";
import {
  banDays,
  type AdminUsersQuery,
  type BanInput,
} from "@/lib/validation/admin-users";
import { adminAction } from "./admin-log";
import { decodeCursor, encodeCursor, PAGE_SIZE } from "./board";
import { ApiError } from "./http";
import type { CurrentUser } from "./session";
import { recountVotes } from "./votes";

const DAY_MS = 24 * 60 * 60 * 1000;

/** A player as the admin sees them in the list. */
export type AdminUser = {
  id: string;
  nickname: string;
  email: string;
  emailVerified: boolean;
  role: "user" | "admin";
  banned: boolean;
  banReason: string | null;
  banExpires: string | null;
  createdAt: string;
  wishesCount: number;
  votesCount: number;
};

export type AdminUsersPage = { users: AdminUser[]; nextCursor: string | null };

/** % and _ in a search are letters, not patterns. */
const likePattern = (text: string) =>
  `%${text.replace(/[\\%_]/g, (char) => `\\${char}`)}%`;

// A ban that has run out counts as none, as at the next sign-in.
const isBanned = sql<boolean>`(${user.banned} and (${user.banExpires} is null or ${user.banExpires} > now()))`;

function selectAdminUsers() {
  return db
    .select({
      user,
      banned: isBanned,
      wishesCount: sql<number>`(select count(*)::int from ${wishes} w where w.author_id = ${user}.id and w.deleted_at is null)`,
      votesCount: sql<number>`(select count(*)::int from ${votes} v where v.user_id = ${user}.id)`,
      createdAtText: sql<string>`${user.createdAt}::text`,
    })
    .from(user)
    .$dynamic();
}

type Row = Awaited<ReturnType<typeof selectAdminUsers>>[number];

function toAdminUser(row: Row): AdminUser {
  const { user: person } = row;
  return {
    id: person.id,
    nickname: person.nickname,
    email: person.email,
    emailVerified: person.emailVerified,
    role: person.role === "admin" ? "admin" : "user",
    banned: row.banned,
    banReason: row.banned ? person.banReason : null,
    banExpires: row.banned ? (person.banExpires?.toISOString() ?? null) : null,
    createdAt: person.createdAt.toISOString(),
    wishesCount: row.wishesCount,
    votesCount: row.votesCount,
  };
}

/**
 * Players by nickname or email (spec, section 6), newest first, 20 a page;
 * only admins, the banned or those with an unconfirmed email on request.
 */
export async function listAdminUsers(
  query: AdminUsersQuery,
): Promise<AdminUsersPage> {
  const conditions: (SQL | undefined)[] = [];
  if (query.q) {
    const pattern = likePattern(query.q);
    conditions.push(
      or(ilike(user.nickname, pattern), ilike(user.email, pattern)),
    );
  }
  if (query.role) conditions.push(eq(user.role, "admin"));
  if (query.state === "banned") conditions.push(isBanned);
  if (query.state === "unverified")
    conditions.push(eq(user.emailVerified, false));
  if (query.cursor) {
    const [, createdAt, id] = decodeCursor(query.cursor, "new");
    conditions.push(
      sql`(${user.createdAt}, ${user.id}) < (${createdAt}::timestamptz, ${id}::uuid)`,
    );
  }

  const rows = await selectAdminUsers()
    .where(and(...conditions))
    .orderBy(desc(user.createdAt), desc(user.id))
    .limit(PAGE_SIZE + 1);
  const page = rows.slice(0, PAGE_SIZE);
  const last = page.at(-1);
  return {
    users: page.map(toAdminUser),
    nextCursor:
      rows.length > PAGE_SIZE && last
        ? encodeCursor(["new", last.createdAtText, last.user.id])
        : null,
  };
}

export type AdminUserHistoryEntry = {
  id: string;
  action: string;
  reason: string | null;
  after: Record<string, unknown> | null;
  admin: string | null;
  createdAt: string;
};

export type AdminUserCard = AdminUser & {
  /** What admins did to this player: bans, unbans, roles. */
  history: AdminUserHistoryEntry[];
  /** Their latest wishes, hidden ones too. */
  wishes: {
    id: string;
    title: string;
    game: { slug: string; title: string };
    status: (typeof wishes.$inferSelect)["status"];
    hidden: boolean;
  }[];
};

const CARD_WISHES = 10;

/** The player's card (spec, section 6), or null. */
export async function getAdminUser(id: string): Promise<AdminUserCard | null> {
  const [row] = await selectAdminUsers().where(eq(user.id, id));
  if (!row) return null;
  const admins = db
    .select({ id: user.id, nickname: user.nickname })
    .from(user)
    .as("admins");
  const [history, latest] = await Promise.all([
    db
      .select({
        id: adminLog.id,
        action: adminLog.action,
        reason: adminLog.reason,
        after: adminLog.after,
        admin: admins.nickname,
        createdAt: adminLog.createdAt,
      })
      .from(adminLog)
      .leftJoin(admins, eq(admins.id, adminLog.adminId))
      .where(
        and(
          eq(adminLog.targetType, "user"),
          eq(adminLog.targetId, id),
          like(adminLog.action, "user.%"),
        ),
      )
      .orderBy(desc(adminLog.createdAt), desc(adminLog.id)),
    db
      .select({
        id: wishes.id,
        title: wishes.title,
        game: { slug: games.slug, title: games.title },
        status: wishes.status,
        hidden: wishes.hidden,
      })
      .from(wishes)
      .innerJoin(games, eq(games.id, wishes.gameId))
      .where(and(eq(wishes.authorId, id), isNull(wishes.deletedAt)))
      .orderBy(desc(wishes.createdAt))
      .limit(CARD_WISHES),
  ]);
  return {
    ...toAdminUser(row),
    history: history.map((entry) => ({
      ...entry,
      after: entry.after as Record<string, unknown> | null,
      createdAt: entry.createdAt.toISOString(),
    })),
    wishes: latest,
  };
}

const refused = (key: Parameters<typeof t>[0]) =>
  new ApiError("FORBIDDEN", { message: t(key) });

async function lockUser(
  tx: Parameters<Parameters<typeof adminAction>[1]>[0],
  id: string,
) {
  const [target] = await tx
    .select()
    .from(user)
    .where(eq(user.id, id))
    .for("update");
  if (!target) throw new ApiError("NOT_FOUND");
  return target;
}

/**
 * Bans a player (spec, section 6) for 1, 7 or 30 days or for good, with a
 * reason they read at sign-in. Their sessions end at once. With `wipe`
 * their wishes are hidden as spam and their votes taken back, the counters
 * recounted in the same transaction. Admins cannot be banned: take the
 * role first.
 */
export async function banUser(
  admin: Pick<CurrentUser, "id">,
  userId: string,
  input: BanInput,
): Promise<{ gameIds: string[] }> {
  if (userId === admin.id) throw refused("admin.users.errors.banSelf");
  return adminAction(admin, async (tx, record) => {
    const target = await lockUser(tx, userId);
    if (target.role === "admin") throw refused("admin.users.errors.banAdmin");

    const banExpires =
      input.duration === "forever"
        ? null
        : new Date(Date.now() + banDays[input.duration] * DAY_MS);
    await tx
      .update(user)
      .set({ banned: true, banReason: input.reason, banExpires })
      .where(eq(user.id, userId));
    await tx.delete(session).where(eq(session.userId, userId));

    const gameIds = new Set<string>();
    let hiddenWishes = 0;
    let removedVotes = 0;
    if (input.wipe) {
      const hidden = await tx
        .update(wishes)
        .set({ hidden: true, hiddenReason: "spam" })
        .where(
          and(
            eq(wishes.authorId, userId),
            eq(wishes.hidden, false),
            isNull(wishes.deletedAt),
          ),
        )
        .returning({ gameId: wishes.gameId });
      hiddenWishes = hidden.length;
      for (const wish of hidden) gameIds.add(wish.gameId);

      const removed = await tx
        .delete(votes)
        .where(eq(votes.userId, userId))
        .returning({ wishId: votes.wishId });
      removedVotes = removed.length;
      const voted = [...new Set(removed.map((vote) => vote.wishId))];
      await recountVotes(tx, voted);
      if (voted.length > 0) {
        const rows = await tx
          .selectDistinct({ gameId: wishes.gameId })
          .from(wishes)
          .where(inArray(wishes.id, voted));
        for (const row of rows) gameIds.add(row.gameId);
      }
    }

    await record({
      action: "user.ban",
      targetType: "user",
      targetId: userId,
      before: {
        banned: target.banned,
        banReason: target.banReason,
        banExpires: target.banExpires?.toISOString() ?? null,
      },
      after: {
        banned: true,
        banReason: input.reason,
        banExpires: banExpires?.toISOString() ?? null,
        duration: input.duration,
        wipe: input.wipe,
        hiddenWishes,
        removedVotes,
      },
      reason: input.reason,
    });
    return { gameIds: [...gameIds] };
  });
}

/** Lifts a ban. Hidden wishes and taken votes do not come back. */
export async function unbanUser(
  admin: Pick<CurrentUser, "id">,
  userId: string,
): Promise<void> {
  await adminAction(admin, async (tx, record) => {
    const target = await lockUser(tx, userId);
    if (!target.banned) return;
    await tx
      .update(user)
      .set({ banned: false, banReason: null, banExpires: null })
      .where(eq(user.id, userId));
    await record({
      action: "user.unban",
      targetType: "user",
      targetId: userId,
      before: {
        banned: true,
        banReason: target.banReason,
        banExpires: target.banExpires?.toISOString() ?? null,
      },
      after: { banned: false },
    });
  });
}

/**
 * Makes a player an admin or takes the role back (spec, section 3). Not
 * one's own role: the admin would lock themselves out, and the site could
 * be left without admins. A new admin has a confirmed email and no ban.
 */
export async function setRole(
  admin: Pick<CurrentUser, "id">,
  userId: string,
  role: "user" | "admin",
): Promise<void> {
  if (userId === admin.id) throw refused("admin.users.errors.roleSelf");
  await adminAction(admin, async (tx, record) => {
    const target = await lockUser(tx, userId);
    if (target.role === role) return;
    if (role === "admin") {
      if (target.banned) throw refused("admin.users.errors.roleBanned");
      if (!target.emailVerified) {
        throw refused("admin.users.errors.roleUnverified");
      }
    }
    await tx.update(user).set({ role }).where(eq(user.id, userId));
    await record({
      action: "user.role",
      targetType: "user",
      targetId: userId,
      before: { role: target.role },
      after: { role },
    });
  });
}
