import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import { db } from "@/lib/db";
import { adminLog, games, user, votes, wishes } from "@/lib/db/schema";
import {
  adminWishBulkSchema,
  adminWishPatchSchema,
  adminWishesQuerySchema,
} from "@/lib/validation/admin-wishes";
import { normalizeTitle } from "@/lib/wishes";
import {
  deleteWishAsAdmin,
  findOriginals,
  listAdminWishes,
  mergeWish,
  moderateWish,
  moderateWishes,
} from "./admin-wishes";
import { PAGE_SIZE } from "./board";
import { setVote } from "./votes";

const DAY_MS = 24 * 60 * 60 * 1000;

async function setup() {
  const [admin, author] = await db
    .insert(user)
    .values([
      {
        nickname: `Admin_${randomUUID().slice(0, 6)}`,
        email: `${randomUUID()}@example.com`,
        role: "admin",
      },
      {
        nickname: `Author_${randomUUID().slice(0, 6)}`,
        email: `${randomUUID()}@example.com`,
      },
    ])
    .returning({ id: user.id, nickname: user.nickname });
  const [village, garden] = await db
    .insert(games)
    .values([
      { slug: "village", title: "Village", published: true },
      { slug: "garden", title: "Garden", published: true },
    ])
    .returning({ id: games.id });
  return {
    admin: admin!,
    author: author!,
    village: village!.id,
    garden: garden!.id,
  };
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
    .returning();
  return row!;
}

const query = (value: Record<string, string> = {}) =>
  adminWishesQuerySchema.parse(value);
const patch = (value: unknown) => adminWishPatchSchema.parse(value);
const journal = () =>
  db
    .select({
      action: adminLog.action,
      targetId: adminLog.targetId,
      before: adminLog.before,
      after: adminLog.after,
      reason: adminLog.reason,
    })
    .from(adminLog)
    .orderBy(adminLog.createdAt);
const row = async (id: string) =>
  (await db.select().from(wishes).where(eq(wishes.id, id)))[0]!;

describe("the moderation table", () => {
  it("shows every game and hidden wishes, and filters them", async () => {
    const { author, village, garden } = await setup();
    await addWish(village, { title: "Видимое", authorId: author.id });
    await addWish(village, {
      title: "Спам по ссылке",
      hidden: true,
      hiddenReason: "spam",
    });
    await addWish(garden, {
      title: "Плохое слово",
      hidden: true,
      hiddenReason: "flagged",
      type: "remove",
    });
    await addWish(garden, { title: "Удалённое", deletedAt: new Date() });
    await addWish(garden, { title: "Готовое", status: "done" });

    const titles = async (value: Record<string, string>) =>
      (await listAdminWishes(query(value))).wishes.map((w) => w.title).sort();
    expect(await titles({})).toEqual([
      "Видимое",
      "Готовое",
      "Плохое слово",
      "Спам по ссылке",
    ]);
    expect(await titles({ game: "garden" })).toEqual([
      "Готовое",
      "Плохое слово",
    ]);
    expect(await titles({ visibility: "hidden" })).toEqual([
      "Плохое слово",
      "Спам по ссылке",
    ]);
    expect(await titles({ visibility: "review" })).toEqual(["Плохое слово"]);
    expect(await titles({ visibility: "visible", status: "done" })).toEqual([
      "Готовое",
    ]);
    expect(await titles({ type: "remove" })).toEqual(["Плохое слово"]);
    expect(await titles({ author: author.nickname.slice(2, 8) })).toEqual([
      "Видимое",
    ]);
    expect(await titles({ q: "ССЫЛК" })).toEqual(["Спам по ссылке"]);
    // An empty field of the filter form is "any".
    expect(await titles({ game: "", status: "", q: "" })).toHaveLength(4);
  });

  it("goes page by page", async () => {
    const { village } = await setup();
    const moment = new Date(Date.now() - DAY_MS);
    for (let i = 0; i < PAGE_SIZE + 3; i++) {
      await addWish(village, { title: `Пожелание ${i}`, createdAt: moment });
    }
    const first = await listAdminWishes(query());
    const second = await listAdminWishes(query({ cursor: first.nextCursor! }));
    const ids = [...first.wishes, ...second.wishes].map((w) => w.id);
    expect(new Set(ids).size).toBe(PAGE_SIZE + 3);
    expect(second.nextCursor).toBeNull();
  });
});

describe("moderating a wish", () => {
  it("sets a status with a version and a reply, each in the journal", async () => {
    const { admin, village } = await setup();
    const wish = await addWish(village, { title: "Режим на время" });

    const result = await moderateWish(
      admin,
      wish.id,
      patch({ status: "done", doneVersion: "1.2.0", studioReply: "Готово!" }),
    );

    expect(result).toEqual({ gameId: village, changed: true });
    expect(await row(wish.id)).toMatchObject({
      status: "done",
      doneVersion: "1.2.0",
      studioReply: "Готово!",
    });
    expect(await journal()).toEqual([
      {
        action: "wish.status",
        targetId: wish.id,
        before: { status: "new", doneVersion: null },
        after: { status: "done", doneVersion: "1.2.0" },
        reason: null,
      },
      {
        action: "wish.reply",
        targetId: wish.id,
        before: { studioReply: null },
        after: { studioReply: "Готово!" },
        reason: null,
      },
    ]);
  });

  it("drops the version when the wish is no longer done", async () => {
    const { admin, village } = await setup();
    const wish = await addWish(village, {
      title: "Режим на время",
      status: "done",
      doneVersion: "1.0",
    });
    await moderateWish(admin, wish.id, patch({ status: "planned" }));
    expect(await row(wish.id)).toMatchObject({
      status: "planned",
      doneVersion: null,
    });
  });

  it("does not decline without a reply", async () => {
    const { admin, village } = await setup();
    const wish = await addWish(village, { title: "Реклама везде" });

    await expect(
      moderateWish(admin, wish.id, patch({ status: "declined" })),
    ).rejects.toMatchObject({
      code: "VALIDATION_ERROR",
      fields: { studioReply: expect.stringContaining("Отклонено") },
    });
    expect(await db.$count(adminLog)).toBe(0);

    await moderateWish(
      admin,
      wish.id,
      patch({ status: "declined", studioReply: "Это сломает баланс." }),
    );
    expect((await row(wish.id)).status).toBe("declined");
    // Nor can the reply of a declined wish be emptied.
    await expect(
      moderateWish(admin, wish.id, patch({ studioReply: "" })),
    ).rejects.toMatchObject({ code: "VALIDATION_ERROR" });
  });

  it("hides with a reason and shows again", async () => {
    const { admin, village } = await setup();
    const wish = await addWish(village, {
      title: "Плохое слово",
      hidden: true,
      hiddenReason: "flagged",
    });

    await moderateWish(
      admin,
      wish.id,
      patch({ hidden: true, hiddenReason: "abuse" }),
    );
    expect(await row(wish.id)).toMatchObject({
      hidden: true,
      hiddenReason: "abuse",
    });
    await moderateWish(admin, wish.id, patch({ hidden: false }));
    expect(await row(wish.id)).toMatchObject({
      hidden: false,
      hiddenReason: null,
    });

    expect((await journal()).map((e) => [e.action, e.reason])).toEqual([
      ["wish.hide", "abuse"],
      ["wish.show", null],
    ]);
    expect(() => patch({ hidden: true })).toThrow();
  });

  it("edits the text, but not into another wish of the same author", async () => {
    const { admin, author, village } = await setup();
    await addWish(village, { title: "Тёмная тема", authorId: author.id });
    const wish = await addWish(village, {
      title: "Темная тема!!",
      authorId: author.id,
    });

    await expect(
      moderateWish(
        admin,
        wish.id,
        patch({ text: { type: "add", title: "ТЁМНАЯ тема", body: "" } }),
      ),
    ).rejects.toMatchObject({ code: "DUPLICATE_WISH" });

    await moderateWish(
      admin,
      wish.id,
      patch({ text: { type: "remove", title: "Светлая тема", body: "Глаза" } }),
    );
    expect(await row(wish.id)).toMatchObject({
      type: "remove",
      title: "Светлая тема",
      titleNormalized: "светлая тема",
      body: "Глаза",
    });
    expect((await journal()).map((e) => e.action)).toEqual(["wish.edit"]);
  });

  it("records nothing when nothing changes", async () => {
    const { admin, village } = await setup();
    const wish = await addWish(village, { title: "Как есть" });
    const result = await moderateWish(
      admin,
      wish.id,
      patch({ status: "new", hidden: false }),
    );
    expect(result.changed).toBe(false);
    expect(await db.$count(adminLog)).toBe(0);
  });

  it("deletes softly and says 404 for a deleted or unknown wish", async () => {
    const { admin, village } = await setup();
    const wish = await addWish(village, { title: "Лишнее" });

    await deleteWishAsAdmin(admin, wish.id);

    expect((await row(wish.id)).deletedAt).toBeInstanceOf(Date);
    expect((await journal()).map((e) => e.action)).toEqual(["wish.delete"]);
    await expect(deleteWishAsAdmin(admin, wish.id)).rejects.toMatchObject({
      code: "NOT_FOUND",
    });
    await expect(
      moderateWish(admin, randomUUID(), patch({ status: "planned" })),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
  });
});

describe("bulk moderation", () => {
  const bulk = (value: unknown) => adminWishBulkSchema.parse(value);

  it("hides, shows and deletes the selected wishes, one record each", async () => {
    const { admin, village, garden } = await setup();
    const a = await addWish(village, { title: "Первое" });
    const b = await addWish(garden, { title: "Второе" });

    const hidden = await moderateWishes(
      admin,
      bulk({ action: "hide", ids: [a.id, b.id, randomUUID()], reason: "spam" }),
    );
    expect(hidden.changedIds.sort()).toEqual([a.id, b.id].sort());
    expect(hidden.gameIds.sort()).toEqual([village, garden].sort());
    expect((await row(a.id)).hiddenReason).toBe("spam");

    await moderateWishes(admin, bulk({ action: "show", ids: [a.id] }));
    expect((await row(a.id)).hidden).toBe(false);

    await moderateWishes(admin, bulk({ action: "delete", ids: [a.id, b.id] }));
    expect((await row(b.id)).deletedAt).not.toBeNull();

    expect((await journal()).map((e) => e.action).sort()).toEqual([
      "wish.delete",
      "wish.delete",
      "wish.hide",
      "wish.hide",
      "wish.show",
    ]);
  });

  it("declines only with a reply for all of them", async () => {
    const { admin, village } = await setup();
    const a = await addWish(village, { title: "Первое" });

    expect(() =>
      bulk({ action: "status", ids: [a.id], status: "declined" }),
    ).toThrow();
    await moderateWishes(
      admin,
      bulk({
        action: "status",
        ids: [a.id],
        status: "declined",
        studioReply: "Не в духе игры.",
      }),
    );
    expect(await row(a.id)).toMatchObject({
      status: "declined",
      studioReply: "Не в духе игры.",
    });
  });
});

describe("merging duplicates", () => {
  async function voters(count: number) {
    return db
      .insert(user)
      .values(
        Array.from({ length: count }, (_, i) => ({
          nickname: `Voter_${i}_${randomUUID().slice(0, 4)}`,
          email: `${randomUUID()}@example.com`,
        })),
      )
      .returning({ id: user.id });
  }

  it("moves the votes once per player and hides the duplicate", async () => {
    const { admin, village } = await setup();
    const [a, b, c] = await voters(3);
    const original = await addWish(village, { title: "Режим на время" });
    const duplicate = await addWish(village, { title: "Режим с таймером" });
    // b voted for both: one vote stays.
    await db.insert(votes).values([
      { wishId: original.id, userId: a!.id },
      { wishId: original.id, userId: b!.id },
      { wishId: duplicate.id, userId: b!.id },
      { wishId: duplicate.id, userId: c!.id },
    ]);
    await db.update(wishes).set({ votesCount: 2 });

    const result = await mergeWish(admin, duplicate.id, original.id);

    expect(result).toEqual({ gameId: village, movedVotes: 1 });
    expect(await row(original.id)).toMatchObject({ votesCount: 3 });
    expect(await row(duplicate.id)).toMatchObject({
      votesCount: 0,
      hidden: true,
      hiddenReason: "duplicate",
      mergedIntoId: original.id,
    });
    expect(await db.$count(votes, eq(votes.wishId, original.id))).toBe(3);
    expect(await db.$count(votes, eq(votes.wishId, duplicate.id))).toBe(0);
    const [entry] = await journal();
    expect(entry).toMatchObject({
      action: "wish.merge",
      targetId: duplicate.id,
      reason: "duplicate",
      after: expect.objectContaining({
        mergedIntoId: original.id,
        movedVotes: 1,
        originalVotesCount: 3,
      }),
    });
  });

  it("leaves no vote on the duplicate when players vote during the merge", async () => {
    const { admin, village } = await setup();
    const original = await addWish(village, { title: "Режим на время" });
    const duplicate = await addWish(village, { title: "Режим с таймером" });
    const players = (await voters(20)).map((p, i) => ({
      id: p.id,
      nickname: `Voter_${i}`,
      email: `voter-${i}@example.com`,
      emailVerified: true,
      role: "user" as const,
      createdAt: new Date(Date.now() - 7 * DAY_MS),
    }));

    const voting = players.map((player) =>
      setVote(player, duplicate.id, true).catch(() => "refused"),
    );
    await Promise.all([mergeWish(admin, duplicate.id, original.id), ...voting]);

    expect(await db.$count(votes, eq(votes.wishId, duplicate.id))).toBe(0);
    expect((await row(duplicate.id)).votesCount).toBe(0);
    expect((await row(original.id)).votesCount).toBe(
      await db.$count(votes, eq(votes.wishId, original.id)),
    );
  });

  it("refuses itself, another game, a hidden original and a second merge", async () => {
    const { admin, village, garden } = await setup();
    const original = await addWish(village, { title: "Режим на время" });
    const duplicate = await addWish(village, { title: "Режим с таймером" });
    const elsewhere = await addWish(garden, { title: "Режим в саду" });
    const hidden = await addWish(village, {
      title: "Скрытый режим",
      hidden: true,
      hiddenReason: "spam",
    });

    const refused = (from: string, to: string) =>
      expect(mergeWish(admin, from, to)).rejects.toMatchObject({
        code: "VALIDATION_ERROR",
        fields: { targetId: expect.any(String) },
      });
    await refused(duplicate.id, duplicate.id);
    await refused(duplicate.id, elsewhere.id);
    await refused(duplicate.id, hidden.id);
    await refused(duplicate.id, randomUUID());

    await mergeWish(admin, duplicate.id, original.id);
    await refused(duplicate.id, original.id);
    // Nor can something be merged into the duplicate now.
    const third = await addWish(village, { title: "Третий режим" });
    await refused(third.id, duplicate.id);
    expect((await journal()).map((e) => e.action)).toEqual(["wish.merge"]);
  });

  it("suggests the closest titles of the same game, visible ones only", async () => {
    const { village, garden } = await setup();
    const duplicate = await addWish(village, {
      title: "Тёмная тема оформления",
    });
    await addWish(village, { title: "Тёмная тема" });
    await addWish(village, { title: "Больше уровней" });
    await addWish(village, {
      title: "Тёмная тема ночью",
      hidden: true,
      hiddenReason: "spam",
    });
    await addWish(garden, { title: "Тёмная тема сада" });

    const titles = async (search?: string) =>
      (await findOriginals(duplicate.id, search)).map((w) => w.title);
    expect((await titles())[0]).toBe("Тёмная тема");
    expect(await titles()).not.toContain("Тёмная тема ночью");
    expect(await titles()).not.toContain("Тёмная тема сада");
    expect(await titles()).not.toContain("Тёмная тема оформления");
    expect(await titles("уровн")).toEqual(["Больше уровней"]);
  });

  it("forgets the original when a merged duplicate is shown again", async () => {
    const { admin, village } = await setup();
    const original = await addWish(village, { title: "Режим на время" });
    const duplicate = await addWish(village, { title: "Режим с таймером" });
    await mergeWish(admin, duplicate.id, original.id);

    await moderateWish(admin, duplicate.id, patch({ hidden: false }));

    expect(await row(duplicate.id)).toMatchObject({
      hidden: false,
      mergedIntoId: null,
    });
  });
});
