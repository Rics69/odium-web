import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { NextRequest } from "next/server";
import { describe, expect, it } from "vitest";
import { GET } from "@/app/api/auth/[...all]/route";
import { db } from "@/lib/db";
import {
  blockedEmailDomains,
  games,
  session as sessions,
  user as users,
  votes,
  wishes,
} from "@/lib/db/schema";
import { countLetters, findLetter } from "@/test/mailpit";
import { signIn } from "./accounts";
import { auth } from "./auth";
import {
  changeEmail,
  changeNickname,
  changePassword,
  deleteAccount,
} from "./profile";
import { getCurrentUser } from "./session";

const PASSWORD = "correct horse battery";
const IP = "203.0.113.5";

const cookieOf = (setCookie: string[]) =>
  setCookie.map((value) => value.split(";")[0]).join("; ");

async function signedInPlayer(nickname = `P_${randomUUID().slice(0, 8)}`) {
  const email = `player-${randomUUID().slice(0, 8)}@example.com`;
  const { headers } = await auth.api.signUpEmail({
    body: { name: nickname, email, password: PASSWORD },
    returnHeaders: true,
  });
  const requestHeaders = new Headers({
    cookie: cookieOf(headers.getSetCookie()),
  });
  const user = (await getCurrentUser(requestHeaders))!;
  return { user, request: { headers: requestHeaders, ip: IP } };
}

describe("changing the nickname", () => {
  it("saves a free one", async () => {
    const { user, request } = await signedInPlayer();

    await changeNickname(user, "Fresh_Name");

    expect(await getCurrentUser(request.headers)).toMatchObject({
      nickname: "Fresh_Name",
    });
  });

  it("refuses one taken by someone else in any case", async () => {
    await signedInPlayer("Pixel");
    const { user } = await signedInPlayer();

    await expect(changeNickname(user, "PIXEL")).rejects.toMatchObject({
      code: "NICKNAME_TAKEN",
      fields: { nickname: "Этот ник уже занят." },
    });
  });

  it("lets a player change the case of their own", async () => {
    const { user } = await signedInPlayer("pixel");
    await expect(changeNickname(user, "Pixel")).resolves.toBeUndefined();
  });
});

describe("changing the password", () => {
  it("asks for the current one", async () => {
    const { user, request } = await signedInPlayer();

    await expect(
      changePassword(
        user,
        { currentPassword: "wrong", newPassword: "a new password" },
        request,
      ),
    ).rejects.toMatchObject({
      code: "WRONG_PASSWORD",
      fields: { currentPassword: "Неверный пароль." },
    });
  });

  it("signs the other devices out and keeps this one", async () => {
    const { user, request } = await signedInPlayer();
    await signIn({ email: user.email, password: PASSWORD }, request);
    expect(await db.$count(sessions)).toBe(2);

    const cookies = await changePassword(
      user,
      { currentPassword: PASSWORD, newPassword: "a new password" },
      request,
    );

    expect(await db.$count(sessions)).toBe(1);
    expect(
      await getCurrentUser(new Headers({ cookie: cookieOf(cookies) })),
    ).toMatchObject({ id: user.id });
    await expect(
      signIn({ email: user.email, password: "a new password" }, request),
    ).resolves.toBeTruthy();
  });

  it("shares the lock of sign-in: ten wrong guesses close the door", async () => {
    const { user, request } = await signedInPlayer();
    const guess = () =>
      changePassword(
        user,
        { currentPassword: "guess", newPassword: "a new password" },
        request,
      );
    for (let i = 0; i < 10; i++) {
      await expect(guess()).rejects.toMatchObject({ code: "WRONG_PASSWORD" });
    }

    await expect(guess()).rejects.toMatchObject({ code: "RATE_LIMITED" });
    await expect(
      signIn({ email: user.email, password: PASSWORD }, request),
    ).rejects.toMatchObject({ code: "RATE_LIMITED" });
  });
});

describe("changing the email", () => {
  const newAddress = () => `new-${randomUUID().slice(0, 8)}@example.com`;

  it("writes to the new address and warns the old one; the switch waits for the link", async () => {
    const { user, request } = await signedInPlayer();
    const email = newAddress();

    await changeEmail(user, { email, currentPassword: PASSWORD }, request);

    const confirm = await findLetter(email, "Подтвердите новую почту");
    const warning = await findLetter(user.email, "меняется");
    expect(warning.Text).toContain(email);
    expect(await getCurrentUser(request.headers)).toMatchObject({
      email: user.email,
    });

    const link = confirm.Text.match(
      /https?:\/\/\S+verify-email\?token=\S+/,
    )![0];
    const response = await GET(
      new NextRequest(link, {
        headers: {
          host: "localhost:3100",
          cookie: request.headers.get("cookie")!,
          "x-forwarded-for": IP,
        },
      }),
      { params: Promise.resolve({}) },
    );
    expect(response.headers.get("location")).toBe(
      "/verify-email?next=%2Fprofile",
    );
    const [row] = await db
      .select({ email: users.email, emailVerified: users.emailVerified })
      .from(users)
      .where(eq(users.id, user.id));
    expect(row).toEqual({ email, emailVerified: true });
  });

  it("asks for the password", async () => {
    const { user, request } = await signedInPlayer();

    await expect(
      changeEmail(
        user,
        { email: newAddress(), currentPassword: "wrong" },
        request,
      ),
    ).rejects.toMatchObject({ code: "WRONG_PASSWORD" });
  });

  it("refuses the same address and disposable ones", async () => {
    const { user, request } = await signedInPlayer();
    await db.insert(blockedEmailDomains).values({ domain: "mailinator.com" });

    await expect(
      changeEmail(
        user,
        { email: user.email, currentPassword: PASSWORD },
        request,
      ),
    ).rejects.toMatchObject({
      fields: { email: "Это ваш текущий адрес." },
    });
    await expect(
      changeEmail(
        user,
        { email: "x@mailinator.com", currentPassword: PASSWORD },
        request,
      ),
    ).rejects.toMatchObject({ code: "VALIDATION_ERROR" });
  });

  it("answers the same for a taken address and writes nothing to it", async () => {
    const other = await signedInPlayer();
    const { user, request } = await signedInPlayer();

    await expect(
      changeEmail(
        user,
        { email: other.user.email, currentPassword: PASSWORD },
        request,
      ),
    ).resolves.toBeUndefined();
    // Letters go out in the background: give them a moment.
    await new Promise((resolve) => setTimeout(resolve, 500));
    expect(
      await countLetters(other.user.email, "Подтвердите новую почту"),
    ).toBe(0);
  });
});

describe("deleting the account", () => {
  it("asks for the password and keeps the account on a wrong one", async () => {
    const { user, request } = await signedInPlayer();

    await expect(deleteAccount(user, "wrong", request)).rejects.toMatchObject({
      code: "WRONG_PASSWORD",
      fields: { password: "Неверный пароль." },
    });
    expect(await db.$count(users)).toBe(1);
  });

  it("removes the account, its sessions and the cookie", async () => {
    const { user, request } = await signedInPlayer();

    const cookies = await deleteAccount(user, PASSWORD, request);

    expect(await db.$count(users)).toBe(0);
    expect(await db.$count(sessions)).toBe(0);
    expect(cookies.join(";")).toMatch(/odium\.session_token=;.*Max-Age=0/);
  });

  it("takes the votes away from the counters and leaves the wishes", async () => {
    const author = await signedInPlayer();
    const { user, request } = await signedInPlayer();
    const [game] = await db
      .insert(games)
      .values({ slug: "village", title: "Village" })
      .returning({ id: games.id });
    const [theirs] = await db
      .insert(wishes)
      .values({
        gameId: game!.id,
        authorId: author.user.id,
        type: "add",
        title: "Больше уровней",
        titleNormalized: "больше уровней",
        votesCount: 2,
      })
      .returning({ id: wishes.id });
    const [mine] = await db
      .insert(wishes)
      .values({
        gameId: game!.id,
        authorId: user.id,
        type: "remove",
        title: "Убрать рекламу",
        titleNormalized: "убрать рекламу",
        votesCount: 1,
      })
      .returning({ id: wishes.id });
    await db.insert(votes).values([
      { wishId: theirs!.id, userId: author.user.id },
      { wishId: theirs!.id, userId: user.id },
      { wishId: mine!.id, userId: user.id },
    ]);

    await deleteAccount(user, PASSWORD, request);

    const rows = await db
      .select({
        id: wishes.id,
        authorId: wishes.authorId,
        votesCount: wishes.votesCount,
      })
      .from(wishes);
    expect(rows).toEqual(
      expect.arrayContaining([
        { id: theirs!.id, authorId: author.user.id, votesCount: 1 },
        { id: mine!.id, authorId: null, votesCount: 0 },
      ]),
    );
  });
});
