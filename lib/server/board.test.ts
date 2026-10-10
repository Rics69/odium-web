import { randomUUID } from "node:crypto";
import { describe, expect, it } from "vitest";
import { db } from "@/lib/db";
import { games, user, votes, wishes } from "@/lib/db/schema";
import { normalizeTitle } from "@/lib/wishes";
import { boardQuerySchema, type BoardQuery } from "@/lib/validation/wishes";
import {
  listMyWishes,
  listWishes,
  PAGE_SIZE,
  queryTopWishes,
  withViewerVotes,
} from "./board";

const DAY_MS = 24 * 60 * 60 * 1000;
const query = (value: Partial<Record<keyof BoardQuery, string>> = {}) =>
  boardQuerySchema.parse(value);

async function setup() {
  const [game] = await db
    .insert(games)
    .values({
      slug: `game-${randomUUID().slice(0, 8)}`,
      title: "G",
      published: true,
    })
    .returning({ id: games.id });
  const people = await db
    .insert(user)
    .values(
      Array.from({ length: 3 }, (_, i) => ({
        nickname: `Player_${i}_${randomUUID().slice(0, 4)}`,
        email: `${randomUUID()}@example.com`,
      })),
    )
    .returning({ id: user.id, nickname: user.nickname });
  return { gameId: game!.id, people };
}

async function addWish(
  gameId: string,
  values: Partial<typeof wishes.$inferInsert> & { title: string },
) {
  const [row] = await db
    .insert(wishes)
    .values({
      gameId,
      type: "add",
      titleNormalized: normalizeTitle(values.title),
      ...values,
    })
    .returning({ id: wishes.id });
  return row!.id;
}

/** Every page of a sort, following the cursors. */
async function allPages(
  gameId: string,
  sort: string,
  viewerId: string | null = null,
) {
  const ids: string[] = [];
  let cursor: string | undefined;
  let pages = 0;
  do {
    const page = await listWishes(
      gameId,
      query({ sort, ...(cursor && { cursor }) }),
      viewerId,
    );
    ids.push(...page.wishes.map((wish) => wish.id));
    cursor = page.nextCursor ?? undefined;
    pages++;
  } while (cursor);
  return { ids, pages };
}

describe("the board", () => {
  it("goes through every wish exactly once in every sort, ties included", async () => {
    const { gameId } = await setup();
    const sameMoment = new Date(Date.now() - DAY_MS);
    // 45 wishes in three groups with the same counters and the same time.
    for (let i = 0; i < 45; i++) {
      await addWish(gameId, {
        title: `Пожелание ${i}`,
        votesCount: i % 3,
        createdAt: sameMoment,
      });
    }

    for (const sort of ["top", "new", "old", "trending"]) {
      const { ids, pages } = await allPages(gameId, sort);
      expect(new Set(ids).size, sort).toBe(45);
      expect(ids, sort).toHaveLength(45);
      expect(pages, sort).toBe(Math.ceil(45 / PAGE_SIZE));
    }
  });

  it("orders popular, new, old and trending", async () => {
    const { gameId, people } = await setup();
    const old = await addWish(gameId, {
      title: "Старое и популярное",
      votesCount: 3,
      createdAt: new Date(Date.now() - 30 * DAY_MS),
    });
    const fresh = await addWish(gameId, {
      title: "Свежее",
      votesCount: 2,
      createdAt: new Date(Date.now() - DAY_MS),
    });
    const middle = await addWish(gameId, {
      title: "Среднее",
      votesCount: 1,
      createdAt: new Date(Date.now() - 10 * DAY_MS),
    });
    // Old votes for the old wish, this week's votes for the fresh one.
    await db.insert(votes).values([
      ...people.map((p) => ({
        wishId: old,
        userId: p.id,
        createdAt: new Date(Date.now() - 20 * DAY_MS),
      })),
      { wishId: fresh, userId: people[0]!.id },
      { wishId: fresh, userId: people[1]!.id },
      {
        wishId: middle,
        userId: people[2]!.id,
        createdAt: new Date(Date.now() - 9 * DAY_MS),
      },
    ]);

    const order = async (sort: string) =>
      (await listWishes(gameId, query({ sort }), null)).wishes.map((w) => w.id);
    expect(await order("top")).toEqual([old, fresh, middle]);
    expect(await order("new")).toEqual([fresh, middle, old]);
    expect(await order("old")).toEqual([old, middle, fresh]);
    expect(await order("trending")).toEqual([fresh, old, middle]);
  });

  it("hides done, declined, hidden and deleted wishes unless asked", async () => {
    const { gameId } = await setup();
    await addWish(gameId, { title: "Новое" });
    await addWish(gameId, { title: "Сделано", status: "done" });
    await addWish(gameId, { title: "Отклонено", status: "declined" });
    await addWish(gameId, {
      title: "Скрыто",
      hidden: true,
      hiddenReason: "spam",
    });
    await addWish(gameId, { title: "Удалено", deletedAt: new Date() });

    const titles = async (value: Record<string, string>) =>
      (await listWishes(gameId, query(value), null)).wishes
        .map((w) => w.title)
        .sort();
    expect(await titles({})).toEqual(["Новое"]);
    expect(await titles({ status: "done" })).toEqual(["Сделано"]);
    expect(await titles({ status: "all" })).toEqual([
      "Новое",
      "Отклонено",
      "Сделано",
    ]);
  });

  it("filters by type, mine, voted and text", async () => {
    const { gameId, people } = await setup();
    const [me, other] = [people[0]!, people[1]!];
    const mine = await addWish(gameId, {
      title: "Кооператив с другом",
      authorId: me.id,
    });
    const removal = await addWish(gameId, {
      title: "Убрать рекламу",
      type: "remove",
      authorId: other.id,
      body: "Особенно 100% полноэкранную",
    });
    await db.insert(votes).values({ wishId: removal, userId: me.id });

    const ids = async (
      value: Record<string, string>,
      viewer: string | null = me.id,
    ) =>
      (await listWishes(gameId, query(value), viewer)).wishes.map((w) => w.id);
    expect(await ids({ type: "remove" })).toEqual([removal]);
    expect(await ids({ mine: "1" })).toEqual([mine]);
    expect(await ids({ voted: "1" })).toEqual([removal]);
    expect(await ids({ mine: "1" }, null)).toEqual([]);
    expect(await ids({ q: "КООПЕРАТИВ" })).toEqual([mine]);
    expect(await ids({ q: "100%" })).toEqual([removal]);
    expect(await ids({ q: "_" })).toEqual([]);
  });

  it("says which wishes the viewer voted for and who wrote them", async () => {
    const { gameId, people } = await setup();
    const voted = await addWish(gameId, {
      title: "С моим голосом",
      authorId: people[1]!.id,
    });
    await addWish(gameId, { title: "Без автора" });
    await db.insert(votes).values({ wishId: voted, userId: people[0]!.id });

    const { wishes: page } = await listWishes(
      gameId,
      query({ sort: "new" }),
      people[0]!.id,
    );

    expect(page.map((w) => [w.title, w.votedByMe, w.author])).toEqual(
      expect.arrayContaining([
        ["С моим голосом", true, { nickname: people[1]!.nickname }],
        ["Без автора", false, null],
      ]),
    );
  });

  it("refuses a cursor of another sort or a made-up one", async () => {
    const { gameId } = await setup();
    for (let i = 0; i < PAGE_SIZE + 1; i++)
      await addWish(gameId, { title: `Пожелание ${i}` });
    const { nextCursor } = await listWishes(
      gameId,
      query({ sort: "new" }),
      null,
    );

    await expect(
      listWishes(gameId, query({ sort: "top", cursor: nextCursor! }), null),
    ).rejects.toMatchObject({ code: "VALIDATION_ERROR" });
    await expect(
      listWishes(gameId, query({ cursor: "garbage" }), null),
    ).rejects.toMatchObject({ code: "VALIDATION_ERROR" });
  });
});

describe("the top of a game page", () => {
  it("is the board's first three: popular, active, visible", async () => {
    const { gameId, people } = await setup();
    const [viewer] = people;
    await addWish(gameId, {
      title: "Сделано давно",
      votesCount: 50,
      status: "done",
    });
    await addWish(gameId, { title: "Скрыто", votesCount: 40, hidden: true });
    await addWish(gameId, {
      title: "Удалено",
      votesCount: 30,
      deletedAt: new Date(),
    });
    const first = await addWish(gameId, { title: "Первое", votesCount: 9 });
    await addWish(gameId, {
      title: "Второе",
      votesCount: 7,
      status: "planned",
    });
    await addWish(gameId, { title: "Третье", votesCount: 5 });
    await addWish(gameId, { title: "Четвёртое", votesCount: 1 });
    await db.insert(votes).values({ wishId: first, userId: viewer!.id });

    const top = await queryTopWishes(gameId);

    expect(top.map((wish) => wish.title)).toEqual([
      "Первое",
      "Второе",
      "Третье",
    ]);
    expect(top.every((wish) => !wish.votedByMe)).toBe(true);
    const seen = await withViewerVotes(top, viewer!.id);
    expect(seen.map((wish) => wish.votedByMe)).toEqual([true, false, false]);
    expect(await withViewerVotes(top, null)).toBe(top);
  });
});

describe("my wishes", () => {
  it("lists the player's wishes in every game, newest first, hidden ones with the reason", async () => {
    const { gameId, people } = await setup();
    const [me, someone] = people;
    const [other] = await db
      .insert(games)
      .values({
        slug: `other-${randomUUID().slice(0, 8)}`,
        title: "Другая",
        published: true,
      })
      .returning({ id: games.id, slug: games.slug });
    const [offSite] = await db
      .insert(games)
      .values({
        slug: `off-${randomUUID().slice(0, 8)}`,
        title: "Снята",
        published: false,
      })
      .returning({ id: games.id });
    const ago = (days: number) => new Date(Date.now() - days * DAY_MS);
    await addWish(gameId, {
      title: "Старое",
      authorId: me!.id,
      createdAt: ago(3),
    });
    await addWish(other!.id, {
      title: "Скрытое",
      authorId: me!.id,
      hidden: true,
      hiddenReason: "off_topic",
      createdAt: ago(2),
    });
    await addWish(gameId, {
      title: "Свежее",
      authorId: me!.id,
      status: "planned",
      createdAt: ago(1),
    });
    await addWish(gameId, {
      title: "Удалённое",
      authorId: me!.id,
      deletedAt: new Date(),
    });
    await addWish(offSite!.id, {
      title: "С неопубликованной игры",
      authorId: me!.id,
    });
    await addWish(gameId, { title: "Чужое", authorId: someone!.id });

    const page = await listMyWishes(me!.id);

    expect(
      page.wishes.map((wish) => [
        wish.title,
        wish.game.title,
        wish.hiddenReason,
      ]),
    ).toEqual([
      ["Свежее", "G", null],
      ["Скрытое", "Другая", "off_topic"],
      ["Старое", "G", null],
    ]);
    expect(page.wishes[1]).toMatchObject({
      hidden: true,
      game: { slug: other!.slug },
      author: { nickname: me!.nickname },
    });
    expect(page.nextCursor).toBeNull();
  });

  it("goes page by page", async () => {
    const { gameId, people } = await setup();
    const [me] = people;
    const sameMoment = new Date(Date.now() - DAY_MS);
    for (let i = 0; i < PAGE_SIZE + 5; i++) {
      await addWish(gameId, {
        title: `Моё ${i}`,
        authorId: me!.id,
        createdAt: sameMoment,
      });
    }

    const first = await listMyWishes(me!.id);
    const second = await listMyWishes(me!.id, first.nextCursor!);

    expect(first.wishes).toHaveLength(PAGE_SIZE);
    expect(second.wishes).toHaveLength(5);
    expect(second.nextCursor).toBeNull();
    const ids = [...first.wishes, ...second.wishes].map((wish) => wish.id);
    expect(new Set(ids).size).toBe(PAGE_SIZE + 5);
    await expect(listMyWishes(me!.id, "nonsense")).rejects.toMatchObject({
      code: "VALIDATION_ERROR",
    });
  });
});
