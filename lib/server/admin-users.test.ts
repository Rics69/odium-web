import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import { db } from "@/lib/db";
import { adminLog, games, session, user, votes, wishes } from "@/lib/db/schema";
import { adminUsersQuerySchema, banSchema } from "@/lib/validation/admin-users";
import {
  banUser,
  getAdminUser,
  listAdminUsers,
  setRole,
  unbanUser,
} from "./admin-users";

const DAY_MS = 24 * 60 * 60 * 1000;

async function person(values: Partial<typeof user.$inferInsert> = {}) {
  const id = randomUUID().slice(0, 6);
  const [row] = await db
    .insert(user)
    .values({
      nickname: `Player_${id}`,
      email: `player-${id}@example.com`,
      emailVerified: true,
      ...values,
    })
    .returning();
  return row!;
}

async function signedIn(userId: string) {
  await db.insert(session).values({
    userId,
    token: randomUUID(),
    expiresAt: new Date(Date.now() + DAY_MS),
  });
}

const ban = (value: unknown) => banSchema.parse(value);
const row = async (id: string) =>
  (await db.select().from(user).where(eq(user.id, id)))[0]!;

describe("banning", () => {
  it("bans for a time with a reason and signs the player out", async () => {
    const admin = await person({ role: "admin" });
    const player = await person();
    await signedIn(player.id);

    await banUser(admin, player.id, ban({ duration: "7d", reason: "Спам" }));

    const banned = await row(player.id);
    expect(banned).toMatchObject({ banned: true, banReason: "Спам" });
    const days = (banned.banExpires!.getTime() - Date.now()) / DAY_MS;
    expect(days).toBeGreaterThan(6.99);
    expect(days).toBeLessThan(7.01);
    expect(await db.$count(session, eq(session.userId, player.id))).toBe(0);
    const [entry] = await db.select().from(adminLog);
    expect(entry).toMatchObject({
      action: "user.ban",
      targetId: player.id,
      reason: "Спам",
      after: expect.objectContaining({ duration: "7d", wipe: false }),
    });
  });

  it("with the wipe hides their wishes and takes back their votes", async () => {
    const admin = await person({ role: "admin" });
    const spammer = await person();
    const other = await person();
    const [game] = await db
      .insert(games)
      .values({ slug: "village", title: "Village", published: true })
      .returning({ id: games.id });
    const [theirs, honest] = await db
      .insert(wishes)
      .values([
        {
          gameId: game!.id,
          authorId: spammer.id,
          type: "add",
          title: "Купите монеты",
          titleNormalized: "купите монеты",
          votesCount: 1,
        },
        {
          gameId: game!.id,
          authorId: other.id,
          type: "add",
          title: "Больше уровней",
          titleNormalized: "больше уровней",
          votesCount: 2,
        },
      ])
      .returning({ id: wishes.id });
    await db.insert(votes).values([
      { wishId: theirs!.id, userId: spammer.id },
      { wishId: honest!.id, userId: spammer.id },
      { wishId: honest!.id, userId: other.id },
    ]);

    const result = await banUser(
      admin,
      spammer.id,
      ban({ duration: "forever", reason: "Накрутка", wipe: true }),
    );

    expect(result.gameIds).toEqual([game!.id]);
    expect((await row(spammer.id)).banExpires).toBeNull();
    const after = await db
      .select({
        id: wishes.id,
        hidden: wishes.hidden,
        hiddenReason: wishes.hiddenReason,
        votesCount: wishes.votesCount,
      })
      .from(wishes);
    expect(after).toEqual(
      expect.arrayContaining([
        { id: theirs!.id, hidden: true, hiddenReason: "spam", votesCount: 0 },
        { id: honest!.id, hidden: false, hiddenReason: null, votesCount: 1 },
      ]),
    );
    const [entry] = await db.select().from(adminLog);
    expect(entry!.after).toMatchObject({ hiddenWishes: 1, removedVotes: 2 });
  });

  it("refuses an admin, oneself and an empty reason", async () => {
    const admin = await person({ role: "admin" });
    const other = await person({ role: "admin" });

    await expect(
      banUser(admin, other.id, ban({ duration: "1d", reason: "x" })),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(
      banUser(admin, admin.id, ban({ duration: "1d", reason: "x" })),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(() => ban({ duration: "1d", reason: "  " })).toThrow();
    expect(() => ban({ duration: "2d", reason: "x" })).toThrow();
    expect(await db.$count(adminLog)).toBe(0);
  });

  it("lifts a ban, once", async () => {
    const admin = await person({ role: "admin" });
    const player = await person({
      banned: true,
      banReason: "Спам",
      banExpires: null,
    });

    await unbanUser(admin, player.id);
    await unbanUser(admin, player.id);

    expect(await row(player.id)).toMatchObject({
      banned: false,
      banReason: null,
    });
    expect(
      (await db.select().from(adminLog)).map((entry) => entry.action),
    ).toEqual(["user.unban"]);
  });
});

describe("roles", () => {
  it("makes an admin and takes the role back, each in the journal", async () => {
    const admin = await person({ role: "admin" });
    const player = await person();

    await setRole(admin, player.id, "admin");
    expect((await row(player.id)).role).toBe("admin");
    await setRole(admin, player.id, "user");
    expect((await row(player.id)).role).toBe("user");

    const card = await getAdminUser(player.id);
    expect(card!.history.map((entry) => [entry.action, entry.admin])).toEqual([
      ["user.role", admin.nickname],
      ["user.role", admin.nickname],
    ]);
  });

  it("does not change one's own role, nor promote the banned or unconfirmed", async () => {
    const admin = await person({ role: "admin" });
    const banned = await person({ banned: true, banReason: "x" });
    const unconfirmed = await person({ emailVerified: false });

    for (const [id, role] of [
      [admin.id, "user"],
      [banned.id, "admin"],
      [unconfirmed.id, "admin"],
    ] as const) {
      await expect(setRole(admin, id, role)).rejects.toMatchObject({
        code: "FORBIDDEN",
      });
    }
    expect(await db.$count(adminLog)).toBe(0);
  });
});

describe("the players list", () => {
  it("finds by part of a nickname or email and filters", async () => {
    const admin = await person({ role: "admin", nickname: "Odium_Team" });
    await person({ nickname: "Bukvoed", email: "reader@mail.ru" });
    await person({
      nickname: "Spammer",
      banned: true,
      banReason: "x",
      banExpires: new Date(Date.now() + DAY_MS),
    });
    // A ban that has run out is no ban.
    await person({
      nickname: "Former",
      banned: true,
      banReason: "x",
      banExpires: new Date(Date.now() - DAY_MS),
    });
    await person({ nickname: "Newbie", emailVerified: false });

    const names = async (value: Record<string, string>) =>
      (await listAdminUsers(adminUsersQuerySchema.parse(value))).users
        .map((u) => u.nickname)
        .sort();
    expect(await names({ q: "VOED" })).toEqual(["Bukvoed"]);
    expect(await names({ q: "mail.ru" })).toEqual(["Bukvoed"]);
    expect(await names({ role: "admin" })).toEqual([admin.nickname]);
    expect(await names({ state: "banned" })).toEqual(["Spammer"]);
    expect(await names({ state: "unverified" })).toEqual(["Newbie"]);
    expect(await names({ q: "" })).toHaveLength(5);
  });
});
