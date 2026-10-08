import { eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import { db } from "@/lib/db";
import { session, user } from "@/lib/db/schema";
import { signIn } from "@/lib/server/accounts";
import { auth } from "@/lib/server/auth";
import { getCurrentUser, requireAdmin } from "@/lib/server/session";
import { createAdmin } from "./admin";

const IP = "203.0.113.5";

async function signInAs(email: string, password: string) {
  const { cookies } = await signIn(
    { email, password },
    { headers: new Headers(), ip: IP },
  );
  return new Headers({
    cookie: cookies.map((value) => value.split(";")[0]).join("; "),
  });
}

describe("create-admin", () => {
  it("creates an admin with a confirmed email and a one-time password", async () => {
    const result = await createAdmin(db, { email: " Owner@Example.com " });

    expect(result).toMatchObject({ status: "created", nickname: "Odium" });
    const password = result.status === "created" ? result.password : "";
    expect(password.length).toBeGreaterThanOrEqual(20);

    const headers = await signInAs("owner@example.com", password);
    expect(await requireAdmin(headers)).toMatchObject({
      nickname: "Odium",
      emailVerified: true,
      role: "admin",
    });
  });

  it("promotes an existing player and signs them out to sign in as admin", async () => {
    await auth.api.signUpEmail({
      body: {
        name: "Pixel",
        email: "pixel@example.com",
        password: "correct horse battery",
      },
    });
    expect(await db.$count(session)).toBe(1);

    expect(await createAdmin(db, { email: "pixel@example.com" })).toEqual({
      status: "promoted",
      nickname: "Pixel",
    });

    expect(await db.$count(session)).toBe(0);
    const headers = await signInAs(
      "pixel@example.com",
      "correct horse battery",
    );
    expect(await getCurrentUser(headers)).toMatchObject({
      role: "admin",
      emailVerified: true,
    });
  });

  it("says so when the player is an admin already", async () => {
    await createAdmin(db, { email: "owner@example.com" });

    expect(await createAdmin(db, { email: "owner@example.com" })).toEqual({
      status: "already-admin",
      nickname: "Odium",
    });
  });

  it("takes a nickname, studio names included, but not a taken one", async () => {
    await createAdmin(db, { email: "one@example.com", nickname: "Moderator" });
    const [row] = await db
      .select({ nickname: user.nickname })
      .from(user)
      .where(eq(user.email, "one@example.com"));
    expect(row?.nickname).toBe("Moderator");

    await expect(
      createAdmin(db, { email: "two@example.com", nickname: "moderator" }),
    ).rejects.toThrow("занят");
  });

  it("refuses a malformed email or nickname", async () => {
    await expect(createAdmin(db, { email: "not-an-email" })).rejects.toThrow();
    await expect(
      createAdmin(db, { email: "x@example.com", nickname: "a b" }),
    ).rejects.toThrow();
  });
});
