import { randomUUID } from "node:crypto";
import { NextRequest } from "next/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import { GET } from "@/app/api/auth/[...all]/route";
import { POST as resetRoute } from "@/app/api/auth/reset-password/route";
import { db } from "@/lib/db";
import { session as sessions, verification } from "@/lib/db/schema";
import { countLetters, findLetter } from "@/test/mailpit";
import { signIn } from "./accounts";
import { auth } from "./auth";
import { requestPasswordReset, resetPassword } from "./password-reset";

const OLD_PASSWORD = "correct horse battery";
const NEW_PASSWORD = "a brand new password";
const IP = "203.0.113.5";
const RESET_SUBJECT = "Новый пароль для Odium";

async function createPlayer() {
  const email = `player-${randomUUID().slice(0, 8)}@example.com`;
  await auth.api.signUpEmail({
    body: {
      name: `P_${randomUUID().slice(0, 8)}`,
      email,
      password: OLD_PASSWORD,
    },
  });
  return email;
}

const request = (email: string, ip = IP) =>
  requestPasswordReset(email, { headers: new Headers(), ip });

/** The token from the latest reset letter to an address. */
async function resetToken(email: string) {
  const letter = await findLetter(email, RESET_SUBJECT);
  const token = letter.Text.match(/\/reset-password\/([^?\s]+)/)?.[1];
  if (!token) throw new Error("No reset link in the letter");
  return token;
}

function openLink(token: string) {
  const url = `http://localhost:3100/api/auth/reset-password/${token}?callbackURL=%2Freset-password`;
  return GET(
    new NextRequest(url, {
      headers: { host: "localhost:3100", "x-forwarded-for": IP },
    }),
    { params: Promise.resolve({}) },
  );
}

const canSignIn = (email: string, password: string) =>
  signIn({ email, password }, { headers: new Headers(), ip: IP }).then(
    () => true,
    () => false,
  );

afterEach(() => {
  vi.useRealTimers();
});

describe("asking for a reset link", () => {
  it("sends a link that opens the reset page with the token", async () => {
    const email = await createPlayer();
    await request(email);

    const token = await resetToken(email);
    const response = await openLink(token);

    expect(response.status).toBe(302);
    expect(response.headers.get("location")).toBe(
      `http://localhost:3100/reset-password?token=${token}`,
    );
  });

  it("answers the same for an unknown address and sends nothing", async () => {
    const email = `nobody-${randomUUID()}@example.com`;

    await expect(request(email)).resolves.toBeUndefined();
    expect(await countLetters(email)).toBe(0);
  });

  it("works three times an hour per address", async () => {
    const email = await createPlayer();
    await request(email, "203.0.113.1");
    await request(email, "203.0.113.2");
    await request(email, "203.0.113.3");

    await expect(request(email, "203.0.113.4")).rejects.toMatchObject({
      code: "RATE_LIMITED",
    });
  });

  it("works three times an hour per IP, whatever the addresses", async () => {
    for (let i = 0; i < 3; i++) await request(`someone-${i}@example.com`);

    await expect(request("someone-3@example.com")).rejects.toMatchObject({
      code: "RATE_LIMITED",
    });
    await expect(
      request("someone-3@example.com", "203.0.113.9"),
    ).resolves.toBeUndefined();
  });

  it("keeps tokens in the database only as hashes", async () => {
    const email = await createPlayer();
    await request(email);
    const token = await resetToken(email);

    const rows = await db.select().from(verification);
    expect(rows.length).toBeGreaterThan(0);
    for (const row of rows) expect(row.identifier).not.toContain(token);
  });
});

describe("setting a new password", () => {
  it("changes the password and signs the player out everywhere", async () => {
    const email = await createPlayer();
    expect(await db.$count(sessions)).toBe(1);
    await request(email);

    await resetPassword(
      { token: await resetToken(email), password: NEW_PASSWORD },
      new Headers(),
    );

    expect(await db.$count(sessions)).toBe(0);
    expect(await canSignIn(email, OLD_PASSWORD)).toBe(false);
    expect(await canSignIn(email, NEW_PASSWORD)).toBe(true);
  });

  it("works once per link", async () => {
    const email = await createPlayer();
    await request(email);
    const token = await resetToken(email);
    await resetPassword({ token, password: NEW_PASSWORD }, new Headers());

    await expect(
      resetPassword({ token, password: "yet another one" }, new Headers()),
    ).rejects.toMatchObject({ code: "RESET_LINK_INVALID" });
    expect((await openLink(token)).headers.get("location")).toContain(
      "error=INVALID_TOKEN",
    );
  });

  it("does not work an hour later", async () => {
    const email = await createPlayer();
    await request(email);
    const token = await resetToken(email);

    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(Date.now() + 60 * 60 * 1000 + 1000);

    expect((await openLink(token)).headers.get("location")).toContain(
      "error=INVALID_TOKEN",
    );
    await expect(
      resetPassword({ token, password: NEW_PASSWORD }, new Headers()),
    ).rejects.toMatchObject({ code: "RESET_LINK_INVALID" });
  });

  it("wants 8 characters at least", async () => {
    const response = await resetRoute(
      new NextRequest("http://localhost:3100/api/auth/reset-password", {
        method: "POST",
        headers: {
          host: "localhost:3100",
          origin: "http://localhost:3100",
          "content-type": "application/json",
          "x-forwarded-for": IP,
        },
        body: JSON.stringify({ token: "anything", password: "short" }),
      }),
      { params: Promise.resolve({}) },
    );

    expect(response.status).toBe(400);
    expect((await response.json()).error.fields).toEqual({
      password: "Пароль — от 8 символов.",
    });
  });
});
