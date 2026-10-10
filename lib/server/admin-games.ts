import "server-only";
import { asc, eq, getTableColumns, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { games, wishes } from "@/lib/db/schema";
import { t } from "@/lib/i18n";
import type { GameInput } from "@/lib/validation/admin-games";
import { adminAction } from "./admin-log";
import { ApiError } from "./http";
import type { CurrentUser } from "./session";
import { isUniqueViolation } from "./wishes";

type GameRow = typeof games.$inferSelect;

/** A game as the admin edits it: every field, drafts included. */
export type AdminGame = Omit<GameRow, "createdAt" | "updatedAt"> & {
  /** All its wishes, hidden and deleted too: any of them keeps it. */
  wishesCount: number;
  createdAt: string;
  updatedAt: string;
};

const wishesCount = sql<number>`(select count(*)::int from ${wishes} w where w.game_id = ${games}.id)`;

function toAdminGame({
  createdAt,
  updatedAt,
  ...game
}: GameRow & { wishesCount: number }): AdminGame {
  return {
    ...game,
    createdAt: createdAt.toISOString(),
    updatedAt: updatedAt.toISOString(),
  };
}

/** Every game, drafts too, in catalogue order. */
export async function listAdminGames(): Promise<AdminGame[]> {
  const rows = await db
    .select({ ...getTableColumns(games), wishesCount })
    .from(games)
    .orderBy(asc(games.sortOrder), asc(games.title));
  return rows.map(toAdminGame);
}

export async function getAdminGame(id: string): Promise<AdminGame | null> {
  const [row] = await db
    .select({ ...getTableColumns(games), wishesCount })
    .from(games)
    .where(eq(games.id, id));
  return row ? toAdminGame(row) : null;
}

const slugTaken = () =>
  new ApiError("VALIDATION_ERROR", {
    fields: { slug: t("admin.games.errors.slugTaken") },
  });

/** The fields that differ, as they were and as they became. */
function difference(before: GameRow, after: GameInput) {
  const was: Record<string, unknown> = {};
  const now: Record<string, unknown> = {};
  for (const key of Object.keys(after) as (keyof GameInput)[]) {
    if (JSON.stringify(before[key]) !== JSON.stringify(after[key])) {
      was[key] = before[key];
      now[key] = after[key];
    }
  }
  return { was, now };
}

/** A new game, a draft until "published" is ticked. */
export async function createGame(
  admin: Pick<CurrentUser, "id">,
  input: GameInput,
): Promise<{ id: string; slug: string }> {
  try {
    return await adminAction(admin, async (tx, record) => {
      const [game] = await tx
        .insert(games)
        .values(input)
        .returning({ id: games.id, slug: games.slug });
      await record({
        action: "game.create",
        targetType: "game",
        targetId: game!.id,
        after: input,
      });
      return game!;
    });
  } catch (error) {
    if (isUniqueViolation(error)) throw slugTaken();
    throw error;
  }
}

/**
 * Saves the whole form; the journal gets only what changed. Returns the
 * old and the new address, whose cached pages are to be dropped.
 */
export async function updateGame(
  admin: Pick<CurrentUser, "id">,
  id: string,
  input: GameInput,
): Promise<{ slugs: string[]; changed: boolean }> {
  try {
    return await adminAction(admin, async (tx, record) => {
      const [game] = await tx
        .select()
        .from(games)
        .where(eq(games.id, id))
        .for("update");
      if (!game) throw new ApiError("NOT_FOUND");
      const { was, now } = difference(game, input);
      if (Object.keys(now).length === 0) {
        return { slugs: [game.slug], changed: false };
      }
      await tx.update(games).set(input).where(eq(games.id, id));
      await record({
        action: "game.update",
        targetType: "game",
        targetId: id,
        before: was,
        after: now,
      });
      return { slugs: [...new Set([game.slug, input.slug])], changed: true };
    });
  } catch (error) {
    if (isUniqueViolation(error)) throw slugTaken();
    throw error;
  }
}

/**
 * Deletes a game without wishes (spec, section 8). One with wishes, even
 * hidden or deleted ones, stays: take it off the site instead.
 */
export async function deleteGame(
  admin: Pick<CurrentUser, "id">,
  id: string,
): Promise<{ slug: string }> {
  return adminAction(admin, async (tx, record) => {
    const [game] = await tx
      .select()
      .from(games)
      .where(eq(games.id, id))
      .for("update");
    if (!game) throw new ApiError("NOT_FOUND");
    if ((await tx.$count(wishes, eq(wishes.gameId, id))) > 0) {
      throw new ApiError("GAME_HAS_WISHES");
    }
    await tx.delete(games).where(eq(games.id, id));
    await record({
      action: "game.delete",
      targetType: "game",
      targetId: id,
      before: { slug: game.slug, title: game.title },
    });
    return { slug: game.slug };
  });
}
