import "server-only";
import { isAPIError } from "better-auth/api";
import { and, eq, ne, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { user as users } from "@/lib/db/schema";
import { t } from "@/lib/i18n";
import { isDisposableEmail, passwordTry } from "./accounts";
import { auth } from "./auth";
import { ApiError } from "./http";
import { hitRateLimit } from "./rate-limit";
import type { CurrentUser } from "./session";

// The profile (step 2.7). Everything but the nickname asks for the password
// again, and those checks share the sign-in limit: a stolen session must
// not become a way to guess the password.

type Request = { headers: Headers; ip: string };

async function checkPassword(
  user: CurrentUser,
  password: string,
  field: string,
  request: Request,
) {
  const attempt = await passwordTry(request.ip, user.email);
  const right = await auth.api
    .verifyPassword({ body: { password }, headers: request.headers })
    .then(
      () => true,
      (error: unknown) => {
        if (isAPIError(error) && error.body?.code === "INVALID_PASSWORD") {
          return false;
        }
        throw error;
      },
    );
  if (!right) {
    await attempt.failed();
    throw new ApiError("WRONG_PASSWORD", {
      fields: { [field]: t("account.profile.wrongPassword") },
    });
  }
  await attempt.passed();
}

/** Same rules as at sign-up; the player's own nickname in other case is fine. */
export async function changeNickname(user: CurrentUser, nickname: string) {
  const taken = () =>
    db
      .select({ id: users.id })
      .from(users)
      .where(
        and(
          sql`lower(${users.nickname}) = lower(${nickname})`,
          ne(users.id, user.id),
        ),
      )
      .limit(1);
  const fail = () =>
    new ApiError("NICKNAME_TAKEN", {
      fields: { nickname: t("account.errors.nicknameTaken") },
    });

  if ((await taken()).length > 0) throw fail();
  try {
    await db.update(users).set({ nickname }).where(eq(users.id, user.id));
  } catch (error) {
    // Someone took it a moment ago: the unique index said no.
    if ((await taken()).length > 0) throw fail();
    throw error;
  }
}

/** A new password; every other session of the player ends. */
export async function changePassword(
  user: CurrentUser,
  input: { currentPassword: string; newPassword: string },
  request: Request,
) {
  await checkPassword(user, input.currentPassword, "currentPassword", request);
  const { headers } = await auth.api.changePassword({
    body: {
      currentPassword: input.currentPassword,
      newPassword: input.newPassword,
      revokeOtherSessions: true,
    },
    headers: request.headers,
    returnHeaders: true,
  });
  // This device gets a fresh session in place of the revoked ones.
  return headers.getSetCookie();
}

/**
 * Asks to move the account to a new address: it takes over once confirmed
 * by the letter sent there, and the old address gets a warning. A taken
 * address gets the same answer and no letter, so nothing is revealed.
 * Shares the limit of confirmation letters: once a minute, five a day.
 */
export async function changeEmail(
  user: CurrentUser,
  input: { email: string; currentPassword: string },
  request: Request,
) {
  if (input.email === user.email) {
    throw new ApiError("VALIDATION_ERROR", {
      fields: { email: t("account.profile.sameEmail") },
    });
  }
  if (await isDisposableEmail(input.email)) {
    throw new ApiError("VALIDATION_ERROR", {
      fields: { email: t("account.errors.emailDisposable") },
    });
  }
  await checkPassword(user, input.currentPassword, "currentPassword", request);
  for (const name of [
    "verificationEmailPerMinute",
    "verificationEmailPerDay",
  ] as const) {
    const limit = await hitRateLimit(name, user.email);
    if (!limit.allowed) {
      throw new ApiError("RATE_LIMITED", {
        retryAfterSeconds: limit.retryAfterSeconds,
      });
    }
  }
  await auth.api.changeEmail({
    body: {
      newEmail: input.email,
      callbackURL: "/verify-email?next=%2Fprofile",
    },
    headers: request.headers,
  });
}

/**
 * Deletes the account with its sessions and sign-in methods (spec, "Мои
 * решения"). From step 3.1 its votes go with it and the counters are
 * recounted, while its wishes stay, signed «Удалённый пользователь».
 * Returns the cookie that ends the session in this browser.
 */
export async function deleteAccount(
  user: CurrentUser,
  password: string,
  request: Request,
) {
  await checkPassword(user, password, "password", request);
  const { headers } = await auth.api.signOut({
    headers: request.headers,
    returnHeaders: true,
  });
  await db.delete(users).where(eq(users.id, user.id));
  return headers.getSetCookie();
}
