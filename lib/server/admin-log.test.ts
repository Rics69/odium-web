import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import { db } from "@/lib/db";
import { adminLog, games, user } from "@/lib/db/schema";
import { adminAction } from "./admin-log";

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

async function aGame() {
  const [game] = await db
    .insert(games)
    .values({ slug: "village", title: "Village" })
    .returning({ id: games.id });
  return game!.id;
}

describe("the admin journal", () => {
  it("records an action with the change it made", async () => {
    const admin = await anAdmin();
    const gameId = await aGame();

    await adminAction(admin, async (tx, record) => {
      await tx
        .update(games)
        .set({ title: "Деревня" })
        .where(eq(games.id, gameId));
      await record({
        action: "game.update",
        targetType: "game",
        targetId: gameId,
        before: { title: "Village" },
        after: { title: "Деревня" },
      });
    });

    expect(await db.select().from(adminLog)).toEqual([
      expect.objectContaining({
        adminId: admin.id,
        action: "game.update",
        targetType: "game",
        targetId: gameId,
        before: { title: "Village" },
        after: { title: "Деревня" },
        reason: null,
      }),
    ]);
  });

  it("keeps neither the change nor the record when the action fails", async () => {
    const admin = await anAdmin();
    const gameId = await aGame();

    await expect(
      adminAction(admin, async (tx, record) => {
        await tx
          .update(games)
          .set({ title: "Деревня" })
          .where(eq(games.id, gameId));
        await record({
          action: "game.update",
          targetType: "game",
          targetId: gameId,
        });
        throw new Error("the action broke after the record");
      }),
    ).rejects.toThrow("the action broke");

    expect(await db.$count(adminLog)).toBe(0);
    const [game] = await db
      .select({ title: games.title })
      .from(games)
      .where(eq(games.id, gameId));
    expect(game?.title).toBe("Village");
  });

  it("outlives the admin's account", async () => {
    const admin = await anAdmin();
    await adminAction(admin, (_tx, record) =>
      record({
        action: "user.ban",
        targetType: "user",
        targetId: randomUUID(),
        reason: "спам",
      }),
    );

    await db.delete(user).where(eq(user.id, admin.id));

    const [entry] = await db.select().from(adminLog);
    expect(entry).toMatchObject({ adminId: null, reason: "спам" });
  });
});
