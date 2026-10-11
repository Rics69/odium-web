import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import { db } from "@/lib/db";
import { adminLog, games, user, wishes } from "@/lib/db/schema";
import { journalQuerySchema } from "@/lib/validation/admin-log";
import { listJournal, listJournalAdmins } from "./admin-journal";
import { PAGE_SIZE } from "./board";

async function person(role = "admin") {
  const [row] = await db
    .insert(user)
    .values({
      nickname: `Person_${randomUUID().slice(0, 6)}`,
      email: `${randomUUID()}@example.com`,
      role,
    })
    .returning({ id: user.id, nickname: user.nickname });
  return row!;
}

const query = (value: Record<string, string> = {}) =>
  journalQuerySchema.parse(value);

describe("the journal", () => {
  it("names each object and links to it while it exists", async () => {
    const admin = await person();
    const player = await person("user");
    const [game] = await db
      .insert(games)
      .values({ slug: "village", title: "Village", published: true })
      .returning({ id: games.id });
    const [wish, gone] = await db
      .insert(wishes)
      .values([
        {
          gameId: game!.id,
          type: "add",
          title: "Режим на время",
          titleNormalized: "режим на время",
        },
        {
          gameId: game!.id,
          type: "add",
          title: "Удалённое",
          titleNormalized: "удалённое",
          deletedAt: new Date(),
        },
      ])
      .returning({ id: wishes.id });
    const at = (minutes: number) => new Date(Date.now() - minutes * 60_000);
    await db.insert(adminLog).values([
      {
        adminId: admin.id,
        action: "wish.hide",
        targetType: "wish",
        targetId: wish!.id,
        reason: "spam",
        createdAt: at(5),
      },
      {
        adminId: admin.id,
        action: "wish.delete",
        targetType: "wish",
        targetId: gone!.id,
        createdAt: at(4),
      },
      {
        adminId: admin.id,
        action: "user.ban",
        targetType: "user",
        targetId: player.id,
        createdAt: at(3),
      },
      {
        adminId: admin.id,
        action: "game.update",
        targetType: "game",
        targetId: game!.id,
        before: { title: "V" },
        after: { title: "Village" },
        createdAt: at(2),
      },
      {
        adminId: admin.id,
        action: "studio.update",
        targetType: "studio",
        targetId: "studio",
        createdAt: at(1),
      },
    ]);

    const { entries } = await listJournal(query());

    expect(entries.map((e) => [e.action, e.targetTitle, e.targetHref])).toEqual(
      [
        ["studio.update", null, "/admin/studio"],
        ["game.update", "Village", `/admin/games/${game!.id}`],
        ["user.ban", player.nickname, `/admin/users/${player.id}`],
        ["wish.delete", "Удалённое", null],
        ["wish.hide", "Режим на время", `/games/village/wishes/${wish!.id}`],
      ],
    );
    expect(entries[1]).toMatchObject({
      admin: { nickname: admin.nickname },
      before: { title: "V" },
      after: { title: "Village" },
    });
  });

  it("filters by admin, action, kind of object and one object", async () => {
    const first = await person();
    const second = await person();
    const target = randomUUID();
    await db.insert(adminLog).values([
      {
        adminId: first.id,
        action: "user.ban",
        targetType: "user",
        targetId: target,
      },
      {
        adminId: first.id,
        action: "user.unban",
        targetType: "user",
        targetId: target,
      },
      {
        adminId: second.id,
        action: "user.ban",
        targetType: "user",
        targetId: randomUUID(),
      },
      {
        adminId: second.id,
        action: "stop_words.update",
        targetType: "stop_words",
        targetId: "stop_words",
      },
    ]);

    const count = async (value: Record<string, string>) =>
      (await listJournal(query(value))).entries.length;
    expect(await count({ admin: first.id })).toBe(2);
    expect(await count({ action: "user.ban" })).toBe(2);
    expect(await count({ type: "user" })).toBe(3);
    expect(await count({ type: "user", target })).toBe(2);
    expect(await count({ admin: "", action: "" })).toBe(4);
    expect(() => query({ action: "user.explode" })).toThrow();
    expect((await listJournalAdmins()).map((a) => a.id).sort()).toEqual(
      [first.id, second.id].sort(),
    );
  });

  it("goes page by page and keeps entries of a deleted admin", async () => {
    const admin = await person();
    const moment = new Date(Date.now() - 60_000);
    await db.insert(adminLog).values(
      Array.from({ length: PAGE_SIZE + 2 }, () => ({
        adminId: admin.id,
        action: "studio.update",
        targetType: "studio",
        targetId: "studio",
        createdAt: moment,
      })),
    );
    await db.delete(user).where(eq(user.id, admin.id));

    const first = await listJournal(query());
    const second = await listJournal(query({ cursor: first.nextCursor! }));
    const ids = [...first.entries, ...second.entries].map((e) => e.id);
    expect(new Set(ids).size).toBe(PAGE_SIZE + 2);
    expect(second.nextCursor).toBeNull();
    expect(first.entries[0]!.admin).toBeNull();
  });
});
