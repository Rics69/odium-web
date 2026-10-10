import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import { db } from "@/lib/db";
import { adminLog, games, user, wishes } from "@/lib/db/schema";
import {
  adminWishBulkSchema,
  adminWishPatchSchema,
  adminWishesQuerySchema,
} from "@/lib/validation/admin-wishes";
import { normalizeTitle } from "@/lib/wishes";
import {
  deleteWishAsAdmin,
  listAdminWishes,
  moderateWish,
  moderateWishes,
} from "./admin-wishes";
import { PAGE_SIZE } from "./board";

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
