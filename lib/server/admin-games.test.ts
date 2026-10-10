import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import { db } from "@/lib/db";
import { adminLog, games, user, wishes } from "@/lib/db/schema";
import { gameInputSchema } from "@/lib/validation/admin-games";
import {
  createGame,
  deleteGame,
  getAdminGame,
  listAdminGames,
  updateGame,
} from "./admin-games";

async function anAdmin() {
  const [admin] = await db
    .insert(user)
    .values({
      nickname: `Admin_${randomUUID().slice(0, 6)}`,
      email: `${randomUUID()}@example.com`,
      role: "admin",
    })
    .returning({ id: user.id });
  return admin!;
}

const form = (values: Record<string, unknown> = {}) =>
  gameInputSchema.parse({
    title: "Деревня Слов",
    slug: "derevnya-slov",
    status: "in_development",
    sortOrder: "1",
    wishesOpen: true,
    published: false,
    ...values,
  });

describe("the game form", () => {
  it("takes YouTube and VK trailers, our images and web store links only", () => {
    const parse = (values: Record<string, unknown>) =>
      gameInputSchema.safeParse({ ...form(), ...values }).success;
    expect(parse({ trailerUrl: "https://youtu.be/aqz-KE-bpKQ" })).toBe(true);
    expect(parse({ trailerUrl: "" })).toBe(true);
    expect(parse({ trailerUrl: "https://vimeo.com/1" })).toBe(false);
    expect(parse({ coverUrl: "/uploads/a.webp" })).toBe(true);
    expect(parse({ coverUrl: "https://evil.example/a.webp" })).toBe(false);
    expect(
      parse({ platforms: [{ store: "rustore", url: "javascript:alert(1)" }] }),
    ).toBe(false);
    expect(
      parse({
        platforms: [
          { store: "rustore", url: null },
          { store: "rustore", url: "https://rustore.ru/x" },
        ],
      }),
    ).toBe(false);
    expect(parse({ slug: "Деревня" })).toBe(false);
    expect(parse({ sortOrder: "1.5" })).toBe(false);
  });
});

describe("games in the admin", () => {
  it("creates a draft and records it", async () => {
    const admin = await anAdmin();
    const { id } = await createGame(admin, form());

    expect(await getAdminGame(id)).toMatchObject({
      title: "Деревня Слов",
      published: false,
      wishesCount: 0,
    });
    const [entry] = await db.select().from(adminLog);
    expect(entry).toMatchObject({ action: "game.create", targetId: id });
  });

  it("refuses an address another game has", async () => {
    const admin = await anAdmin();
    await createGame(admin, form());
    await expect(
      createGame(admin, form({ title: "Другая" })),
    ).rejects.toMatchObject({
      code: "VALIDATION_ERROR",
      fields: { slug: expect.any(String) },
    });
  });

  it("records only the fields that changed, with the old address", async () => {
    const admin = await anAdmin();
    const { id } = await createGame(admin, form());

    const result = await updateGame(
      admin,
      id,
      form({ slug: "village", published: true }),
    );
    expect(result).toEqual({
      slugs: ["derevnya-slov", "village"],
      changed: true,
    });
    expect(
      await updateGame(admin, id, form({ slug: "village", published: true })),
    ).toEqual({ slugs: ["village"], changed: false });

    const entries = await db
      .select()
      .from(adminLog)
      .where(eq(adminLog.action, "game.update"));
    expect(entries).toHaveLength(1);
    expect(entries[0]).toMatchObject({
      before: { slug: "derevnya-slov", published: false },
      after: { slug: "village", published: true },
    });
  });

  it("deletes only a game without wishes", async () => {
    const admin = await anAdmin();
    const empty = await createGame(admin, form({ slug: "empty" }));
    const busy = await createGame(admin, form({ slug: "busy" }));
    await db.insert(wishes).values({
      gameId: busy.id,
      type: "add",
      title: "Удалённое",
      titleNormalized: "удалённое",
      deletedAt: new Date(),
    });

    await expect(deleteGame(admin, busy.id)).rejects.toMatchObject({
      code: "GAME_HAS_WISHES",
    });
    await deleteGame(admin, empty.id);

    expect((await listAdminGames()).map((game) => game.slug)).toEqual(["busy"]);
    expect(
      (await db.select({ action: adminLog.action }).from(adminLog)).map(
        (entry) => entry.action,
      ),
    ).toEqual(["game.create", "game.create", "game.delete"]);
    expect((await db.select().from(games)).length).toBe(1);
  });
});
