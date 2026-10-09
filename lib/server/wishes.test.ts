import { randomUUID } from "node:crypto";
import { eq, sql } from "drizzle-orm";
import { NextRequest } from "next/server";
import { describe, expect, it } from "vitest";
import { POST } from "@/app/api/games/[slug]/wishes/route";
import { db } from "@/lib/db";
import { games, stopWords, user, votes, wishes } from "@/lib/db/schema";
import { auth } from "./auth";
import { getCurrentUser, type CurrentUser } from "./session";
import { createWish } from "./wishes";

const DAY_MS = 24 * 60 * 60 * 1000;

async function addGame(values: Partial<typeof games.$inferInsert> = {}) {
  const slug = `game-${randomUUID().slice(0, 8)}`;
  await db
    .insert(games)
    .values({ slug, title: slug, published: true, ...values });
  return slug;
}

/** A player with a confirmed email, a week old unless said otherwise. */
async function player({
  ageDays = 7,
  role = "user",
}: { ageDays?: number; role?: "user" | "admin" } = {}) {
  const email = `p-${randomUUID().slice(0, 8)}@example.com`;
  const { headers } = await auth.api.signUpEmail({
    body: {
      name: `P_${randomUUID().slice(0, 8)}`,
      email,
      password: "correct horse battery",
    },
    returnHeaders: true,
  });
  await db
    .update(user)
    .set({
      emailVerified: true,
      role,
      createdAt: new Date(Date.now() - ageDays * DAY_MS),
    })
    .where(eq(user.email, email));
  const cookie = headers
    .getSetCookie()
    .map((value) => value.split(";")[0])
    .join("; ");
  const requestHeaders = new Headers({ cookie });
  return {
    user: (await getCurrentUser(requestHeaders)) as CurrentUser,
    headers: requestHeaders,
  };
}

const wish = (title: string, body = "") => ({
  type: "add" as const,
  title,
  body,
});

describe("creating a wish", () => {
  it("saves it with the author's vote", async () => {
    const slug = await addGame();
    const { user: author } = await player();

    const created = await createWish(author, slug, wish("Больше уровней"));

    expect(created).toMatchObject({
      title: "Больше уровней",
      status: "new",
      votesCount: 1,
      votedByMe: true,
      hidden: false,
      author: { nickname: author.nickname },
    });
    const rows = await db.select().from(votes);
    expect(rows).toEqual([
      expect.objectContaining({ wishId: created.id, userId: author.id }),
    ]);
  });

  it("is refused on an unpublished game and on a closed board", async () => {
    const { user: author } = await player();
    const hidden = await addGame({ published: false });
    const closed = await addGame({ wishesOpen: false });

    await expect(
      createWish(author, hidden, wish("Новый уровень")),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
    await expect(
      createWish(author, closed, wish("Новый уровень")),
    ).rejects.toMatchObject({ code: "WISHES_CLOSED" });
  });

  it("refuses the same wish again, whatever the case, spaces and ё", async () => {
    const slug = await addGame();
    const { user: author } = await player();
    await createWish(author, slug, wish("Тёмная тема"));

    await expect(
      createWish(author, slug, wish("  ТЕМНАЯ   тема ")),
    ).rejects.toMatchObject({
      code: "DUPLICATE_WISH",
      fields: { title: "У вас уже есть такое пожелание к этой игре." },
    });
  });

  it("creates one wish when the same one is sent many times at once", async () => {
    const slug = await addGame();
    const { user: author } = await player({ role: "admin" });

    const results = await Promise.allSettled(
      Array.from({ length: 10 }, () =>
        createWish(author, slug, wish("Кооператив")),
      ),
    );

    expect(
      results.filter((result) => result.status === "fulfilled"),
    ).toHaveLength(1);
    expect(await db.$count(wishes)).toBe(1);
  });

  it("allows 5 an hour, and refusals for duplicates do not count", async () => {
    const slug = await addGame();
    const { user: author } = await player();
    await createWish(author, slug, wish("Пожелание номер 1"));
    await expect(
      createWish(author, slug, wish("Пожелание номер 1")),
    ).rejects.toThrow();
    for (let n = 2; n <= 5; n++) {
      await createWish(author, slug, wish(`Пожелание номер ${n}`));
    }

    await expect(
      createWish(author, slug, wish("Пожелание номер 6")),
    ).rejects.toMatchObject({ code: "RATE_LIMITED" });
  });

  it("allows 2 a day for an account younger than a day", async () => {
    const slug = await addGame();
    const { user: author } = await player({ ageDays: 0 });
    await createWish(author, slug, wish("Первое пожелание"));
    await createWish(author, slug, wish("Второе пожелание"));

    await expect(
      createWish(author, slug, wish("Третье пожелание")),
    ).rejects.toMatchObject({ code: "RATE_LIMITED" });
  });

  it("puts no limits on admins", async () => {
    const slug = await addGame();
    const { user: admin } = await player({ role: "admin", ageDays: 0 });

    for (let n = 1; n <= 25; n++) {
      await createWish(admin, slug, wish(`Пожелание админа ${n}`));
    }
    expect(await db.$count(wishes)).toBe(25);
  });

  it("hides a wish with a stop word until an admin looks", async () => {
    const slug = await addGame();
    const { user: author } = await player();
    await db.insert(stopWords).values({ word: "казино" });

    const created = await createWish(
      author,
      slug,
      wish("Добавить мини-игры", "Например, своё КАЗИНО в деревне"),
    );

    expect(created.hidden).toBe(true);
    const [row] = await db
      .select({ hiddenReason: wishes.hiddenReason })
      .from(wishes);
    expect(row?.hiddenReason).toBe("flagged");
  });

  it("keeps the counter equal to the votes", async () => {
    const slug = await addGame();
    const { user: author } = await player({ role: "admin" });
    for (let n = 1; n <= 3; n++) {
      await createWish(author, slug, wish(`Пожелание счётчика ${n}`));
    }
    const { rows } = await db.execute<{ off: number }>(sql`
      select count(*)::int as off from wishes w
      where w.votes_count <> (select count(*) from votes v where v.wish_id = w.id)
    `);
    expect(rows[0]?.off).toBe(0);
  });
});

// The 201 answer is checked in e2e: revalidateTag needs a real request.
describe("POST /api/games/:slug/wishes", () => {
  function post(slug: string, headers: Headers, body: unknown) {
    headers.set("host", "localhost:3100");
    headers.set("origin", "http://localhost:3100");
    headers.set("content-type", "application/json");
    headers.set("x-forwarded-for", "203.0.113.5");
    return POST(
      new NextRequest(`http://localhost:3100/api/games/${slug}/wishes`, {
        method: "POST",
        headers,
        body: JSON.stringify(body),
      }),
      { params: Promise.resolve({ slug }) },
    );
  }

  it("sends a guest to sign in", async () => {
    const slug = await addGame();
    const response = await post(slug, new Headers(), wish("Больше уровней"));

    expect(response.status).toBe(401);
  });

  it("asks for a confirmed email", async () => {
    const slug = await addGame();
    const { user: author, headers } = await player();
    await db
      .update(user)
      .set({ emailVerified: false })
      .where(eq(user.id, author.id));

    const response = await post(slug, headers, wish("Больше уровней"));

    expect(response.status).toBe(403);
    expect((await response.json()).error.code).toBe("EMAIL_NOT_VERIFIED");
  });

  it("answers 400 per field for a bad wish", async () => {
    const slug = await addGame();
    const { headers } = await player();

    const response = await post(slug, headers, { type: "add", title: "Да" });

    expect(response.status).toBe(400);
    expect((await response.json()).error.fields).toEqual({
      title: "Заголовок — от 5 символов.",
    });
  });
});
