import "server-only";
import {
  and,
  asc,
  desc,
  eq,
  gt,
  ilike,
  inArray,
  isNull,
  notInArray,
  or,
  sql,
  type SQL,
} from "drizzle-orm";
import { unstable_cache } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { games, user, votes, wishes } from "@/lib/db/schema";
import { boardQuerySchema, type BoardQuery } from "@/lib/validation/wishes";
import { cacheTags } from "./cache-tags";
import { ApiError } from "./http";
import type { WishView } from "./wishes";

export const PAGE_SIZE = 20;
const TRENDING_DAYS = 7;

// The keys a page ends on, by sort; the next page starts after them. Times
// travel as Postgres text: a JS Date would cut microseconds off and break
// the comparison.
const cursorSchema = z.union([
  z.tuple([z.literal("top"), z.number(), z.string(), z.uuid()]),
  z.tuple([z.literal("new"), z.string(), z.uuid()]),
  z.tuple([z.literal("old"), z.string(), z.uuid()]),
  z.tuple([
    z.literal("trending"),
    z.number(),
    z.number(),
    z.string(),
    z.uuid(),
  ]),
]);
type Cursor = z.infer<typeof cursorSchema>;

const encodeCursor = (cursor: Cursor) =>
  Buffer.from(JSON.stringify(cursor)).toString("base64url");

function decodeCursor<Sort extends BoardQuery["sort"]>(
  value: string,
  sort: Sort,
): Extract<Cursor, [Sort, ...unknown[]]> {
  try {
    const cursor = cursorSchema.parse(
      JSON.parse(Buffer.from(value, "base64url").toString("utf8")),
    );
    if (cursor[0] === sort) {
      return cursor as Extract<Cursor, [Sort, ...unknown[]]>;
    }
  } catch {
    // Falls through.
  }
  throw new ApiError("VALIDATION_ERROR", {
    fields: { cursor: "invalid" },
  });
}

/** % and _ in a search are letters, not patterns. */
const likePattern = (text: string) =>
  `%${text.replace(/[\\%_]/g, (char) => `\\${char}`)}%`;

export type BoardPage = { wishes: WishView[]; nextCursor: string | null };

function toView({
  wish,
  author,
  votedByMe,
}: {
  wish: typeof wishes.$inferSelect;
  author: string | null;
  votedByMe: boolean;
}): WishView {
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
    votedByMe,
    hidden: wish.hidden,
    author: author === null ? null : { nickname: author },
    createdAt: wish.createdAt.toISOString(),
  };
}

/**
 * A page of a game's board (spec, section 5): 20 wishes after the cursor.
 * Keyset pagination: each page continues from the last keys of the one
 * before, so the thousandth page is as quick as the first. Hidden and
 * deleted wishes are not on the board. "Mine" and "voted" for a guest are
 * simply empty.
 */
export async function listWishes(
  gameId: string,
  query: BoardQuery,
  viewerId: string | null,
  pageSize = PAGE_SIZE,
): Promise<BoardPage> {
  if ((query.mine || query.voted) && !viewerId) {
    return { wishes: [], nextCursor: null };
  }

  const recentVotes = db
    .select({
      wishId: votes.wishId,
      count: sql<number>`count(*)::int`.as("recent_count"),
    })
    .from(votes)
    .innerJoin(wishes, eq(wishes.id, votes.wishId))
    .where(
      and(
        eq(wishes.gameId, gameId),
        gt(
          votes.createdAt,
          sql`now() - make_interval(days => ${TRENDING_DAYS})`,
        ),
      ),
    )
    .groupBy(votes.wishId)
    .as("recent_votes");
  // Votes of the last week: joined for "trending" only.
  const recent =
    query.sort === "trending"
      ? sql<number>`coalesce(${recentVotes.count}, 0)`
      : sql<number>`0`;
  const createdAtText = sql<string>`${wishes.createdAt}::text`;

  const conditions: (SQL | undefined)[] = [
    eq(wishes.gameId, gameId),
    eq(wishes.hidden, false),
    isNull(wishes.deletedAt),
  ];
  if (query.type) conditions.push(eq(wishes.type, query.type));
  if (!query.status) {
    conditions.push(notInArray(wishes.status, ["done", "declined"]));
  } else if (query.status !== "all") {
    conditions.push(eq(wishes.status, query.status));
  }
  if (query.mine) conditions.push(eq(wishes.authorId, viewerId!));
  if (query.voted) {
    conditions.push(
      inArray(
        wishes.id,
        db
          .select({ id: votes.wishId })
          .from(votes)
          .where(eq(votes.userId, viewerId!)),
      ),
    );
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
      case "trending":
        conditions.push(
          sql`(${recent}, ${wishes.votesCount}, ${wishes.createdAt}, ${wishes.id}) < (${cursor[1]}, ${cursor[2]}, ${cursor[3]}::timestamptz, ${cursor[4]}::uuid)`,
        );
        break;
    }
  }

  const order = {
    top: [desc(wishes.votesCount), desc(wishes.createdAt), desc(wishes.id)],
    new: [desc(wishes.createdAt), desc(wishes.id)],
    old: [asc(wishes.createdAt), asc(wishes.id)],
    trending: [
      desc(recent),
      desc(wishes.votesCount),
      desc(wishes.createdAt),
      desc(wishes.id),
    ],
  }[query.sort];

  const myVote = db
    .select({ wishId: votes.wishId })
    .from(votes)
    .where(eq(votes.userId, viewerId ?? sql`null::uuid`))
    .as("my_vote");

  let select = db
    .select({
      wish: wishes,
      author: user.nickname,
      votedByMe: sql<boolean>`${myVote.wishId} is not null`,
      recent,
      createdAtText,
    })
    .from(wishes)
    .leftJoin(user, eq(user.id, wishes.authorId))
    .leftJoin(myVote, eq(myVote.wishId, wishes.id))
    .$dynamic();
  if (query.sort === "trending") {
    select = select.leftJoin(recentVotes, eq(recentVotes.wishId, wishes.id));
  }
  const rows = await select
    .where(and(...conditions))
    .orderBy(...order)
    .limit(pageSize + 1);

  const page = rows.slice(0, pageSize);
  const last = page.at(-1);
  let nextCursor: string | null = null;
  if (rows.length > pageSize && last) {
    const { wish } = last;
    nextCursor = encodeCursor(
      query.sort === "top"
        ? ["top", wish.votesCount, last.createdAtText, wish.id]
        : query.sort === "trending"
          ? [
              "trending",
              last.recent,
              wish.votesCount,
              last.createdAtText,
              wish.id,
            ]
          : [query.sort, last.createdAtText, wish.id],
    );
  }

  return {
    wishes: page.map(toView),
    nextCursor,
  };
}

/** A published game's id and whether its board takes new wishes. */
export async function findBoardGame(slug: string) {
  const [game] = await db
    .select({
      id: games.id,
      slug: games.slug,
      title: games.title,
      wishesOpen: games.wishesOpen,
    })
    .from(games)
    .where(and(eq(games.slug, slug), eq(games.published, true)));
  return game ?? null;
}

export const SIMILAR_LIMIT = 3;

/**
 * Up to 3 wishes of the game whose titles look like the one being typed
 * (spec, section 5): trigram similarity, closest first. Every
 * status counts, a done wish is worth knowing about; hidden and deleted
 * ones do not show.
 */
export async function findSimilarWishes(
  gameId: string,
  text: string,
  viewerId: string | null,
): Promise<WishView[]> {
  const myVote = db
    .select({ wishId: votes.wishId })
    .from(votes)
    .where(eq(votes.userId, viewerId ?? sql`null::uuid`))
    .as("my_vote");
  const rows = await db
    .select({
      wish: wishes,
      author: user.nickname,
      votedByMe: sql<boolean>`${myVote.wishId} is not null`,
    })
    .from(wishes)
    .leftJoin(user, eq(user.id, wishes.authorId))
    .leftJoin(myVote, eq(myVote.wishId, wishes.id))
    .where(
      and(
        eq(wishes.gameId, gameId),
        eq(wishes.hidden, false),
        isNull(wishes.deletedAt),
        sql`${wishes.title} % ${text}`,
      ),
    )
    // Trigram distance: the GiST index gives the closest ones first.
    .orderBy(sql`${wishes.title} <-> ${text}`)
    .limit(SIMILAR_LIMIT);
  return rows.map(toView);
}

export const TOP_LIMIT = 3;

/** The top of the board as a guest sees it: the same for everyone. */
export async function queryTopWishes(gameId: string): Promise<WishView[]> {
  const top = await listWishes(
    gameId,
    boardQuerySchema.parse({}),
    null,
    TOP_LIMIT,
  );
  return top.wishes;
}

/** Marks the wishes this viewer voted for. */
export async function withViewerVotes(
  list: WishView[],
  viewerId: string | null,
): Promise<WishView[]> {
  if (!viewerId || list.length === 0) return list;
  const mine = await db
    .select({ wishId: votes.wishId })
    .from(votes)
    .where(
      and(
        eq(votes.userId, viewerId),
        inArray(
          votes.wishId,
          list.map((wish) => wish.id),
        ),
      ),
    );
  const voted = new Set(mine.map((row) => row.wishId));
  return list.map((wish) => ({ ...wish, votedByMe: voted.has(wish.id) }));
}

/**
 * The 3 most popular wishes of a game for its page (spec, section 4): the
 * board's first three in its default order, cached for everyone, with this
 * viewer's votes on top.
 */
export async function topWishes(
  gameId: string,
  viewerId: string | null,
): Promise<WishView[]> {
  const top = await unstable_cache(
    () => queryTopWishes(gameId),
    ["top-wishes", gameId],
    { tags: [cacheTags.wishes(gameId)] },
  )();
  return withViewerVotes(top, viewerId);
}

/** A wish in the player's own list: with its game and why it is hidden. */
export type MyWish = WishView & {
  game: { slug: string; title: string };
  hiddenReason: (typeof wishes.$inferSelect)["hiddenReason"];
};
export type MyWishesPage = { wishes: MyWish[]; nextCursor: string | null };

/**
 * The player's own wishes across all games (spec, section 9), newest
 * first, 20 a page: hidden ones too, with the reason, so the author knows
 * what happened. Deleted wishes and games taken off the site are not here.
 */
export async function listMyWishes(
  userId: string,
  cursor?: string,
): Promise<MyWishesPage> {
  const conditions: SQL[] = [
    eq(wishes.authorId, userId),
    isNull(wishes.deletedAt),
    eq(games.published, true),
  ];
  if (cursor) {
    const [, createdAt, id] = decodeCursor(cursor, "new");
    conditions.push(
      sql`(${wishes.createdAt}, ${wishes.id}) < (${createdAt}::timestamptz, ${id}::uuid)`,
    );
  }
  const myVote = db
    .select({ wishId: votes.wishId })
    .from(votes)
    .where(eq(votes.userId, userId))
    .as("my_vote");
  const rows = await db
    .select({
      wish: wishes,
      author: user.nickname,
      votedByMe: sql<boolean>`${myVote.wishId} is not null`,
      game: { slug: games.slug, title: games.title },
      createdAtText: sql<string>`${wishes.createdAt}::text`,
    })
    .from(wishes)
    .innerJoin(games, eq(games.id, wishes.gameId))
    .innerJoin(user, eq(user.id, wishes.authorId))
    .leftJoin(myVote, eq(myVote.wishId, wishes.id))
    .where(and(...conditions))
    .orderBy(desc(wishes.createdAt), desc(wishes.id))
    .limit(PAGE_SIZE + 1);

  const page = rows.slice(0, PAGE_SIZE);
  const last = page.at(-1);
  return {
    wishes: page.map((row) => ({
      ...toView(row),
      game: row.game,
      hiddenReason: row.wish.hiddenReason,
    })),
    nextCursor:
      rows.length > PAGE_SIZE && last
        ? encodeCursor(["new", last.createdAtText, last.wish.id])
        : null,
  };
}
