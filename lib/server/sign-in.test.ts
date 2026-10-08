import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { afterEach, describe, expect, it, vi } from "vitest";
import { db } from "@/lib/db";
import { session as sessions, user as users } from "@/lib/db/schema";
import { signIn } from "./accounts";
import { auth } from "./auth";
import { getCurrentUser } from "./session";

const PASSWORD = "correct horse battery";
const IP = "203.0.113.5";

async function createPlayer() {
  const email = `player-${randomUUID().slice(0, 8)}@example.com`;
  const { user } = await auth.api.signUpEmail({
    body: { name: `P_${randomUUID().slice(0, 8)}`, email, password: PASSWORD },
  });
  await db.delete(sessions);
  return { id: user.id, email };
}

const attempt = (email: string, password: string, ip = IP) =>
  signIn({ email, password }, { headers: new Headers(), ip });

const failTimes = async (times: number, email: string) => {
  for (let i = 0; i < times; i++) {
    await expect(attempt(email, "wrong password")).rejects.toMatchObject({
      code: "INVALID_CREDENTIALS",
    });
  }
};

afterEach(() => {
  vi.useRealTimers();
});

describe("sign-in", () => {
  it("signs a player in with the right pair", async () => {
    const player = await createPlayer();

    const { cookies } = await attempt(player.email, PASSWORD);

    const cookie = cookies.map((value) => value.split(";")[0]).join("; ");
    expect(await getCurrentUser(new Headers({ cookie }))).toMatchObject({
      id: player.id,
    });
  });

  it("gives one answer for a wrong password and an unknown address", async () => {
    const player = await createPlayer();

    const wrongPassword = await attempt(player.email, "nope").catch((e) => e);
    const unknownEmail = await attempt("nobody@example.com", PASSWORD).catch(
      (e) => e,
    );

    for (const error of [wrongPassword, unknownEmail]) {
      expect(error).toMatchObject({
        code: "INVALID_CREDENTIALS",
        message: "Неверная почта или пароль.",
      });
    }
  });

  describe("after ten failures", () => {
    it("locks the IP + email pair out for 15 minutes, right password too", async () => {
      const player = await createPlayer();
      await failTimes(10, player.email);

      await expect(attempt(player.email, PASSWORD)).rejects.toMatchObject({
        code: "RATE_LIMITED",
        retryAfterSeconds: 15 * 60,
      });
    });

    it("leaves the same address from another IP alone", async () => {
      const player = await createPlayer();
      await failTimes(10, player.email);

      await expect(
        attempt(player.email, PASSWORD, "203.0.113.6"),
      ).resolves.toBeTruthy();
    });

    it("lets the pair try again once the lock is over", async () => {
      const player = await createPlayer();
      await failTimes(10, player.email);
      const lockedAt = Date.now();

      vi.useFakeTimers({ toFake: ["Date"] });
      vi.setSystemTime(lockedAt + 14 * 60 * 1000);
      await expect(attempt(player.email, PASSWORD)).rejects.toMatchObject({
        code: "RATE_LIMITED",
      });
      vi.setSystemTime(lockedAt + 15 * 60 * 1000 + 1000);
      await expect(attempt(player.email, PASSWORD)).resolves.toBeTruthy();
    });
  });

  it("starts the count over after a success", async () => {
    const player = await createPlayer();
    await failTimes(9, player.email);
    await attempt(player.email, PASSWORD);

    await failTimes(9, player.email);
    await expect(attempt(player.email, PASSWORD)).resolves.toBeTruthy();
  });

  it("checks no more than ten passwords when guesses come at once", async () => {
    const player = await createPlayer();

    const results = await Promise.all(
      Array.from({ length: 25 }, () =>
        attempt(player.email, "wrong password").catch(
          (error: { code: string }) => error.code,
        ),
      ),
    );

    expect(
      results.filter((code) => code === "INVALID_CREDENTIALS"),
    ).toHaveLength(10);
    expect(results.filter((code) => code === "RATE_LIMITED")).toHaveLength(15);
  });

  describe("a banned player", () => {
    it("reads why and until when, and gets no session", async () => {
      const player = await createPlayer();
      await db
        .update(users)
        .set({
          banned: true,
          banReason: "спам в пожеланиях",
          banExpires: new Date("2099-10-15T15:30:00Z"),
        })
        .where(eq(users.id, player.id));

      await expect(attempt(player.email, PASSWORD)).rejects.toMatchObject({
        code: "BANNED",
        message:
          "Аккаунт заблокирован до 15 октября 2099 г. в 18:30 по Москве. Причина: спам в пожеланиях",
      });
      expect(await db.$count(sessions)).toBe(0);
    });

    it("is told a ban without an end is for good", async () => {
      const player = await createPlayer();
      await db
        .update(users)
        .set({ banned: true, banReason: "читы" })
        .where(eq(users.id, player.id));

      await expect(attempt(player.email, PASSWORD)).rejects.toMatchObject({
        message: "Аккаунт заблокирован навсегда. Причина: читы",
      });
    });

    it("hears about the ban only with the right password", async () => {
      const player = await createPlayer();
      await db
        .update(users)
        .set({ banned: true })
        .where(eq(users.id, player.id));

      await expect(attempt(player.email, "wrong")).rejects.toMatchObject({
        code: "INVALID_CREDENTIALS",
      });
    });

    it("signs in again once the ban is over", async () => {
      const player = await createPlayer();
      await db
        .update(users)
        .set({ banned: true, banExpires: new Date(Date.now() - 1000) })
        .where(eq(users.id, player.id));

      await expect(attempt(player.email, PASSWORD)).resolves.toBeTruthy();
      const [row] = await db
        .select({ banned: users.banned })
        .from(users)
        .where(eq(users.id, player.id));
      expect(row?.banned).toBe(false);
    });
  });
});
