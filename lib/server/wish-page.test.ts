import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { afterEach, describe, expect, it, vi } from "vitest";
import { db } from "@/lib/db";
import { games, stopWords, user, wishes } from "@/lib/db/schema";
import type { CurrentUser } from "./session";
import { createWish, deleteWish, getWish, updateWish } from "./wishes";

async function person(role: "user" | "admin" = "user"): Promise<CurrentUser> {
  const id = randomUUID().slice(0, 8);
  const [row] = await db
    .insert(user)
    .values({
      nickname: `P_${id}`,
      email: `${id}@example.com`,
      emailVerified: true,
      role,
    })
    .returning();
  return {
    id: row!.id,
    nickname: row!.nickname,
    email: row!.email,
    emailVerified: true,
    role,
    createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
  };
}

async function setup() {
  const slug = `game-${randomUUID().slice(0, 8)}`;
  await db.insert(games).values({ slug, title: "Деревня", published: true });
  const author = await person();
  const wish = await createWish(author, slug, {
    type: "add",
    title: "Больше уровней",
    body: "Хочется\\nещё",
  });
  return { slug, author, wishId: wish.id };
}

const input = (title: string, body = "") => ({
  type: "add" as const,
  title,
  body,
});

afterEach(() => {
  vi.useRealTimers();
});

describe("reading a wish", () => {
  it("shows it with its game, and what the author may do", async () => {
    const { author, wishId, slug } = await setup();

    const asAuthor = await getWish(wishId, author);
    expect(asAuthor).toMatchObject({
      title: "Больше уровней",
      game: { slug, title: "Деревня" },
      votedByMe: true,
      canDelete: true,
    });
    expect(asAuthor?.editableUntil).not.toBeNull();

    const asGuest = await getWish(wishId, null);
    expect(asGuest).toMatchObject({
      votedByMe: false,
      canDelete: false,
      editableUntil: null,
    });
  });

  it("shows a hidden wish to its author with the reason and to admins only", async () => {
    const { author, wishId } = await setup();
    await db
      .update(wishes)
      .set({ hidden: true, hiddenReason: "off_topic" })
      .where(eq(wishes.id, wishId));

    expect(await getWish(wishId, null)).toBeNull();
    expect(await getWish(wishId, await person())).toBeNull();
    expect(await getWish(wishId, author)).toMatchObject({
      hiddenReason: "off_topic",
    });
    expect(await getWish(wishId, await person("admin"))).toMatchObject({
      hidden: true,
    });
  });

  it("is gone once deleted or when the game is unpublished", async () => {
    const { author, wishId, slug } = await setup();
    await db
      .update(games)
      .set({ published: false })
      .where(eq(games.slug, slug));
    expect(await getWish(wishId, author)).toBeNull();
  });
});

describe("editing a wish", () => {
  it("lets the author change it within 15 minutes", async () => {
    const { author, wishId } = await setup();

    await updateWish(
      author,
      wishId,
      input("Больше уровней в лесу", "Новый текст"),
    );

    expect(await getWish(wishId, author)).toMatchObject({
      title: "Больше уровней в лесу",
      body: "Новый текст",
    });
  });

  it("is closed after 15 minutes and once the status changes", async () => {
    const { author, wishId } = await setup();
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(Date.now() + 15 * 60 * 1000 + 1000);
    await expect(
      updateWish(author, wishId, input("Поздно правлю")),
    ).rejects.toMatchObject({
      code: "EDIT_CLOSED",
    });
    vi.useRealTimers();

    const other = await setup();
    await db
      .update(wishes)
      .set({ status: "planned" })
      .where(eq(wishes.id, other.wishId));
    await expect(
      updateWish(other.author, other.wishId, input("Уже в планах")),
    ).rejects.toMatchObject({ code: "EDIT_CLOSED" });
  });

  it("is not there for anyone but the author", async () => {
    const { wishId } = await setup();
    await expect(
      updateWish(await person(), wishId, input("Чужая правка")),
    ).rejects.toMatchObject({
      code: "NOT_FOUND",
    });
  });

  it("refuses a duplicate of the author's other wish", async () => {
    const { author, wishId, slug } = await setup();
    await createWish(author, slug, input("Тёмная тема"));

    await expect(
      updateWish(author, wishId, input("ТЕМНАЯ тема")),
    ).rejects.toMatchObject({
      code: "DUPLICATE_WISH",
    });
  });

  it("hides it for review when a stop word comes in, and keeps a moderator's hiding", async () => {
    const { author, wishId } = await setup();
    await db.insert(stopWords).values({ word: "казино" });

    expect(
      await updateWish(author, wishId, input("Казино в деревне")),
    ).toMatchObject({
      hidden: true,
    });
    const [row] = await db.select().from(wishes).where(eq(wishes.id, wishId));
    expect(row?.hiddenReason).toBe("flagged");

    await db
      .update(wishes)
      .set({ hiddenReason: "spam" })
      .where(eq(wishes.id, wishId));
    await updateWish(author, wishId, input("Тихая деревня"));
    const [after] = await db.select().from(wishes).where(eq(wishes.id, wishId));
    expect(after).toMatchObject({ hidden: true, hiddenReason: "spam" });
  });

  it("allows 10 edits an hour", async () => {
    const { author, wishId } = await setup();
    for (let i = 0; i < 10; i++) {
      await updateWish(author, wishId, input(`Правка номер ${i}`));
    }
    await expect(
      updateWish(author, wishId, input("Одиннадцатая")),
    ).rejects.toMatchObject({
      code: "RATE_LIMITED",
    });
  });
});

describe("deleting a wish", () => {
  it("lets the author delete a new one", async () => {
    const { author, wishId } = await setup();

    await deleteWish(author, wishId);

    expect(await getWish(wishId, author)).toBeNull();
    const [row] = await db.select().from(wishes).where(eq(wishes.id, wishId));
    expect(row?.deletedAt).not.toBeNull();
  });

  it("is closed once the studio looks at it, and for others", async () => {
    const { author, wishId } = await setup();
    await expect(deleteWish(await person(), wishId)).rejects.toMatchObject({
      code: "NOT_FOUND",
    });
    await db
      .update(wishes)
      .set({ status: "review" })
      .where(eq(wishes.id, wishId));
    await expect(deleteWish(author, wishId)).rejects.toMatchObject({
      code: "DELETE_CLOSED",
    });
  });
});
