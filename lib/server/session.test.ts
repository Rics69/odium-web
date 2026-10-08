import { eq } from "drizzle-orm";
import { NextRequest } from "next/server";
import { describe, expect, it } from "vitest";
import { GET, POST } from "@/app/api/auth/[...all]/route";
import { db } from "@/lib/db";
import { session as sessions, user as users } from "@/lib/db/schema";
import { auth } from "./auth";
import {
  getCurrentUser,
  requireAdmin,
  requireUser,
  requireVerifiedUser,
} from "./session";

const DAY_MS = 24 * 60 * 60 * 1000;

async function signUp(nickname = "Pixel", email = "pixel@example.com") {
  const { headers, response } = await auth.api.signUpEmail({
    body: { name: nickname, email, password: "correct horse battery" },
    returnHeaders: true,
  });
  const setCookie = headers.getSetCookie();
  const cookie = setCookie.map((value) => value.split(";")[0]).join("; ");
  return { user: response.user, setCookie, headers: new Headers({ cookie }) };
}

function callAuthRoute(
  handler: typeof GET,
  path: string,
  headers: Record<string, string> = {},
) {
  const request = new NextRequest(`http://localhost:3100/api/auth${path}`, {
    method: handler === GET ? "GET" : "POST",
    headers: {
      host: "localhost:3100",
      origin: "http://localhost:3100",
      "x-forwarded-for": "203.0.113.5",
      "content-type": "application/json",
      ...headers,
    },
    body: handler === GET ? undefined : "{}",
  });
  return handler(request, { params: Promise.resolve({}) });
}

async function setUser(id: string, values: Partial<typeof users.$inferInsert>) {
  await db.update(users).set(values).where(eq(users.id, id));
}

describe("sessions", () => {
  it("knows the signed-in player", async () => {
    const { user, headers } = await signUp();

    expect(await getCurrentUser(headers)).toEqual({
      id: user.id,
      nickname: "Pixel",
      email: "pixel@example.com",
      emailVerified: false,
      role: "user",
      createdAt: expect.any(Date),
    });
  });

  it("treats a missing or forged cookie as a guest", async () => {
    expect(await getCurrentUser(new Headers())).toBeNull();
    expect(
      await getCurrentUser(
        new Headers({ cookie: "odium.session_token=forged.value" }),
      ),
    ).toBeNull();
  });

  it("keeps the session in an httpOnly, SameSite=Lax cookie for 30 days", async () => {
    const { setCookie } = await signUp();

    const session = setCookie.find((value) =>
      value.startsWith("odium.session_token="),
    );
    expect(session).toMatch(/Max-Age=2592000/);
    expect(session).toMatch(/HttpOnly/);
    expect(session).toMatch(/SameSite=Lax/);
  });

  it("stores ids as UUIDs", async () => {
    const { user } = await signUp();
    expect(user.id).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/,
    );
  });

  it("does not let two players share a nickname in any case", async () => {
    await signUp("Pixel", "first@example.com");

    await expect(signUp("pIXEL", "second@example.com")).rejects.toThrow();
    expect(await db.$count(users)).toBe(1);
  });

  describe("extending a session", () => {
    async function ageSession(headers: Headers, days: number) {
      const expiresAt = new Date(Date.now() + (30 - days) * DAY_MS);
      await db.update(sessions).set({ expiresAt });
      return expiresAt;
    }

    it("never happens while pages read it", async () => {
      const { headers } = await signUp();
      const expiresAt = await ageSession(headers, 2);

      await getCurrentUser(headers);

      const [row] = await db.select().from(sessions);
      expect(row?.expiresAt).toEqual(expiresAt);
    });

    it("happens on /api/auth/get-session and renews the cookie", async () => {
      const { headers } = await signUp();
      await ageSession(headers, 2);

      const response = await callAuthRoute(GET, "/get-session", {
        cookie: headers.get("cookie")!,
      });

      expect(response.status).toBe(200);
      expect(response.headers.get("set-cookie")).toMatch(/Max-Age=2592000/);
      const [row] = await db.select().from(sessions);
      expect(row!.expiresAt.getTime()).toBeGreaterThan(
        Date.now() + 29.9 * DAY_MS,
      );
    });
  });

  describe("bans", () => {
    it("sign a banned player out at once", async () => {
      const { user, headers } = await signUp();
      await setUser(user.id, { banned: true, banReason: "spam" });

      expect(await getCurrentUser(headers)).toBeNull();
      expect(await db.$count(sessions)).toBe(0);
    });

    it("keep a player out until the ban ends", async () => {
      const { user, headers } = await signUp();
      await setUser(user.id, {
        banned: true,
        banExpires: new Date(Date.now() + DAY_MS),
      });

      expect(await getCurrentUser(headers)).toBeNull();
    });

    it("are lifted at the first check after they end", async () => {
      const { user, headers } = await signUp();
      await setUser(user.id, {
        banned: true,
        banReason: "spam",
        banExpires: new Date(Date.now() - 1000),
      });

      expect(await getCurrentUser(headers)).toMatchObject({ id: user.id });
      const [row] = await db.select().from(users);
      expect(row).toMatchObject({
        banned: false,
        banReason: null,
        banExpires: null,
      });
    });
  });
});

describe("rights checks", () => {
  it("send a guest to sign in", async () => {
    await expect(requireUser(new Headers())).rejects.toMatchObject({
      code: "UNAUTHORIZED",
    });
  });

  it("ask for a confirmed email where it is needed", async () => {
    const { user, headers } = await signUp();

    await expect(requireUser(headers)).resolves.toMatchObject({
      id: user.id,
    });
    await expect(requireVerifiedUser(headers)).rejects.toMatchObject({
      code: "EMAIL_NOT_VERIFIED",
    });

    await setUser(user.id, { emailVerified: true });
    await expect(requireVerifiedUser(headers)).resolves.toMatchObject({
      emailVerified: true,
    });
  });

  it("let only admins into the admin", async () => {
    const { user, headers } = await signUp();

    await expect(requireAdmin(headers)).rejects.toMatchObject({
      code: "FORBIDDEN",
    });

    await setUser(user.id, { role: "admin" });
    await expect(requireAdmin(headers)).resolves.toMatchObject({
      role: "admin",
    });
  });
});

describe("Better Auth routes", () => {
  it("keep the admin plugin's endpoints closed", async () => {
    const { user, headers } = await signUp();
    await setUser(user.id, { role: "admin" });

    for (const path of ["/admin/ban-user", "/admin/set-role"]) {
      const response = await callAuthRoute(POST, path, {
        cookie: headers.get("cookie")!,
      });
      expect(response.status).toBe(404);
    }
    const response = await callAuthRoute(GET, "/admin/list-users", {
      cookie: headers.get("cookie")!,
    });
    expect(response.status).toBe(404);
  });

  it("do not change nicknames past our checks", async () => {
    const { headers } = await signUp();

    const response = await callAuthRoute(POST, "/update-user", {
      cookie: headers.get("cookie")!,
    });

    expect(response.status).toBe(404);
  });
});
