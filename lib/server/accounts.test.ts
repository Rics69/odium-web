import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { NextRequest } from "next/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import { GET } from "@/app/api/auth/[...all]/route";
import { db } from "@/lib/db";
import {
  blockedEmailDomains,
  rateLimits,
  user as users,
} from "@/lib/db/schema";
import { countLetters, findLetter } from "@/test/mailpit";
import {
  isDisposableEmail,
  resendVerificationEmail,
  signUp,
  verifyEmailCallback,
} from "./accounts";
import { limits } from "./limits";
import { getCurrentUser } from "./session";

const IP = "203.0.113.5";

function newPlayer(overrides: { nickname?: string; next?: string } = {}) {
  const id = randomUUID().slice(0, 8);
  return {
    email: `player-${id}@example.com`,
    nickname: overrides.nickname ?? `Pixel_${id}`,
    password: "correct horse battery",
    next: overrides.next,
  };
}

function register(input = newPlayer(), ip = IP) {
  return signUp(input, { headers: new Headers(), ip });
}

const cookieHeader = (setCookie: string[]) =>
  new Headers({
    cookie: setCookie.map((value) => value.split(";")[0]).join("; "),
  });

/** The link of the latest confirmation letter to an address. */
async function confirmationLink(email: string) {
  const letter = await findLetter(email);
  const link = letter.Text.match(/https?:\/\/\S+verify-email\?token=\S+/)?.[0];
  if (!link) throw new Error("No confirmation link in the letter");
  return link;
}

function openLink(link: string, cookie?: string) {
  const request = new NextRequest(link, {
    headers: {
      host: new URL(link).host,
      "x-forwarded-for": IP,
      ...(cookie && { cookie }),
    },
  });
  return GET(request, { params: Promise.resolve({}) });
}

afterEach(() => {
  vi.useRealTimers();
});

describe("sign-up", () => {
  it("creates the account and signs the player in, unconfirmed", async () => {
    const player = newPlayer();

    const { user, cookies } = await register(player);

    expect(user).toMatchObject({ name: player.nickname, email: player.email });
    expect(await getCurrentUser(cookieHeader(cookies))).toMatchObject({
      nickname: player.nickname,
      emailVerified: false,
    });
  });

  it("sends a confirmation letter that leads back where the player came from", async () => {
    const player = newPlayer({ next: "/games/neon-garden/wishes" });
    await register(player);

    const link = await confirmationLink(player.email);

    expect(new URL(link).searchParams.get("callbackURL")).toBe(
      "/verify-email?next=%2Fgames%2Fneon-garden%2Fwishes",
    );
  });

  it("refuses disposable addresses, subdomains included", async () => {
    // Tests start from empty tables; the real list comes with a migration.
    await db
      .insert(blockedEmailDomains)
      .values([{ domain: "mailinator.com" }, { domain: "yopmail.com" }]);

    for (const email of ["pixel@mailinator.com", "pixel@x.yopmail.com"]) {
      await expect(register({ ...newPlayer(), email })).rejects.toMatchObject({
        code: "VALIDATION_ERROR",
        fields: { email: expect.stringContaining("Одноразовые") },
      });
    }
    expect(await isDisposableEmail("pixel@gmail.com")).toBe(false);
  });

  it("refuses a nickname that is taken in any case", async () => {
    await register(newPlayer({ nickname: "Pixel" }));

    await expect(
      register(newPlayer({ nickname: "pIXEL" })),
    ).rejects.toMatchObject({
      code: "NICKNAME_TAKEN",
      fields: { nickname: "Этот ник уже занят." },
    });
  });

  it("refuses an address that is taken", async () => {
    const player = newPlayer();
    await register(player);

    await expect(
      register({ ...newPlayer(), email: player.email }),
    ).rejects.toMatchObject({ code: "EMAIL_TAKEN" });
  });

  it("lets 3 accounts an hour from one IP, not counting refused tries", async () => {
    const taken = newPlayer({ nickname: "Taken" });
    await register(taken);
    await expect(
      register({ ...taken, email: "x@example.com" }),
    ).rejects.toThrow();
    await register();
    await register();

    await expect(register()).rejects.toMatchObject({ code: "RATE_LIMITED" });
    await expect(register(newPlayer(), "203.0.113.6")).resolves.toBeTruthy();
    expect(limits.signUp.max).toBe(3);
  });
});

describe("the confirmation link", () => {
  it("confirms the address, signs the player in and returns them", async () => {
    const player = newPlayer({ next: "/games" });
    await register(player);

    const response = await openLink(await confirmationLink(player.email));

    expect(response.status).toBe(302);
    expect(response.headers.get("location")).toBe(
      "/verify-email?next=%2Fgames",
    );
    const cookies = response.headers.getSetCookie();
    expect(await getCurrentUser(cookieHeader(cookies))).toMatchObject({
      email: player.email,
      emailVerified: true,
    });
  });

  it("does not sign anyone in a second time", async () => {
    const player = newPlayer();
    await register(player);
    const link = await confirmationLink(player.email);
    await openLink(link);

    const again = await openLink(link);

    expect(again.status).toBe(302);
    expect(again.headers.get("location")).toBe("/verify-email");
    expect(again.headers.getSetCookie()).toEqual([]);
  });

  it("expires after 24 hours", async () => {
    const player = newPlayer();
    await register(player);
    const link = await confirmationLink(player.email);

    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(Date.now() + 24 * 60 * 60 * 1000 + 1000);
    const response = await openLink(link);

    expect(response.headers.get("location")).toBe(
      "/verify-email?error=TOKEN_EXPIRED",
    );
    const [row] = await db
      .select({ emailVerified: users.emailVerified })
      .from(users)
      .where(eq(users.email, player.email));
    expect(row?.emailVerified).toBe(false);
  });
});

describe("sending the letter again", () => {
  it("works once a minute", async () => {
    const player = newPlayer();
    await register(player);
    await expect.poll(() => countLetters(player.email)).toBe(1);

    await resendVerificationEmail({ email: player.email }, new Headers());
    await expect.poll(() => countLetters(player.email)).toBe(2);

    await expect(
      resendVerificationEmail({ email: player.email }, new Headers()),
    ).rejects.toMatchObject({ code: "RATE_LIMITED" });
  });

  it("works five times a day", async () => {
    const player = newPlayer();
    await register(player);
    const now = Date.now();
    vi.useFakeTimers({ toFake: ["Date"] });

    for (let minute = 0; minute < 5; minute++) {
      vi.setSystemTime(now + minute * 61_000);
      await resendVerificationEmail({ email: player.email }, new Headers());
    }
    vi.setSystemTime(now + 6 * 61_000);

    await expect(
      resendVerificationEmail({ email: player.email }, new Headers()),
    ).rejects.toMatchObject({ code: "RATE_LIMITED" });
  });

  it("answers the same for an unknown address and sends nothing", async () => {
    const email = `nobody-${randomUUID()}@example.com`;

    await expect(
      resendVerificationEmail({ email }, new Headers()),
    ).resolves.toBeUndefined();
    expect(await countLetters(email)).toBe(0);
  });

  it("tells a confirmed player their address is confirmed", async () => {
    const player = newPlayer();
    const { cookies } = await register(player);
    await db
      .update(users)
      .set({ emailVerified: true })
      .where(eq(users.email, player.email));

    await expect(
      resendVerificationEmail({ email: player.email }, cookieHeader(cookies)),
    ).rejects.toMatchObject({ code: "EMAIL_ALREADY_VERIFIED" });
  });

  it("counts per address", async () => {
    const player = newPlayer();
    await register(player);
    await resendVerificationEmail({ email: player.email }, new Headers());

    const keys = (await db.select().from(rateLimits)).map((row) => row.key);
    expect(keys).toContain(`verificationEmailPerMinute:${player.email}`);
  });
});

describe("verifyEmailCallback", () => {
  it("keeps the way back only to pages of the site", () => {
    expect(verifyEmailCallback("/games")).toBe("/verify-email?next=%2Fgames");
    expect(verifyEmailCallback("https://evil.example")).toBe("/verify-email");
    expect(verifyEmailCallback(undefined)).toBe("/verify-email");
  });
});
