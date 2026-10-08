import "server-only";
import { isAPIError } from "better-auth/api";
import { eq, inArray, or, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { blockedEmailDomains, user as users } from "@/lib/db/schema";
import { t } from "@/lib/i18n";
import { safeNextPath } from "@/lib/next-path";
import type { SignInInput, SignUpInput } from "@/lib/validation/account";
import { auth } from "./auth";
import { ApiError, type FieldErrors } from "./http";
import { locks } from "./limits";
import {
  hitRateLimit,
  lock,
  lockSecondsLeft,
  resetRateLimit,
} from "./rate-limit";

// Sign-up, email confirmation and sign-in. Better Auth keeps the accounts;
// our checks and limits run first, and its own routes for these are closed.

/** The link in a confirmation letter leads here, then back to `next`. */
export function verifyEmailCallback(next?: string): string {
  const path = safeNextPath(next);
  return path === "/"
    ? "/verify-email"
    : `/verify-email?next=${encodeURIComponent(path)}`;
}

/** mailinator.com and its subdomains, and the rest of the blocked list. */
export async function isDisposableEmail(email: string): Promise<boolean> {
  const labels = (email.split("@")[1] ?? "").split(".");
  // a.b.example.com → a.b.example.com, b.example.com, example.com
  const domains = labels
    .slice(0, -1)
    .map((_, index) => labels.slice(index).join("."));
  if (domains.length === 0) return false;
  const [blocked] = await db
    .select({ domain: blockedEmailDomains.domain })
    .from(blockedEmailDomains)
    .where(inArray(blockedEmailDomains.domain, domains))
    .limit(1);
  return Boolean(blocked);
}

async function takenFields(
  nickname: string,
  email: string,
): Promise<FieldErrors> {
  const rows = await db
    .select({ nickname: users.nickname, email: users.email })
    .from(users)
    .where(
      or(
        sql`lower(${users.nickname}) = lower(${nickname})`,
        eq(users.email, email),
      ),
    );
  const fields: FieldErrors = {};
  if (rows.some((row) => row.email === email)) {
    fields.email = t("account.errors.emailTaken");
  }
  if (
    rows.some((row) => row.nickname.toLowerCase() === nickname.toLowerCase())
  ) {
    fields.nickname = t("account.errors.nicknameTaken");
  }
  return fields;
}

function throwIfTaken(fields: FieldErrors) {
  if (fields.email) throw new ApiError("EMAIL_TAKEN", { fields });
  if (fields.nickname) throw new ApiError("NICKNAME_TAKEN", { fields });
}

/**
 * Creates an account and signs the player in; the confirmation letter goes
 * out in the background. Only sign-ups that pass every check count against
 * the per-IP limit, so a taken nickname costs nothing.
 */
export async function signUp(
  input: SignUpInput,
  request: { headers: Headers; ip: string },
) {
  if (await isDisposableEmail(input.email)) {
    throw new ApiError("VALIDATION_ERROR", {
      fields: { email: t("account.errors.emailDisposable") },
    });
  }
  throwIfTaken(await takenFields(input.nickname, input.email));

  const limit = await hitRateLimit("signUp", request.ip);
  if (!limit.allowed) {
    throw new ApiError("RATE_LIMITED", {
      retryAfterSeconds: limit.retryAfterSeconds,
    });
  }

  try {
    const { headers, response } = await auth.api.signUpEmail({
      body: {
        name: input.nickname,
        email: input.email,
        password: input.password,
        callbackURL: verifyEmailCallback(input.next),
      },
      headers: request.headers,
      returnHeaders: true,
    });
    return { user: response.user, cookies: headers.getSetCookie() };
  } catch (error) {
    // Someone took the nickname or the address a moment ago.
    throwIfTaken(await takenFields(input.nickname, input.email));
    throw error;
  }
}

/**
 * Sends the confirmation letter again: once a minute and five times a day
 * per address. For an unknown or confirmed address it answers the same way
 * and sends nothing, so the answer does not reveal who is registered.
 */
export async function resendVerificationEmail(
  input: { email: string; next?: string },
  headers: Headers,
) {
  for (const name of [
    "verificationEmailPerMinute",
    "verificationEmailPerDay",
  ] as const) {
    const limit = await hitRateLimit(name, input.email);
    if (!limit.allowed) {
      throw new ApiError("RATE_LIMITED", {
        retryAfterSeconds: limit.retryAfterSeconds,
      });
    }
  }

  try {
    await auth.api.sendVerificationEmail({
      body: {
        email: input.email,
        callbackURL: verifyEmailCallback(input.next),
      },
      headers,
    });
  } catch (error) {
    // Only a signed-in player hears these: about their own address.
    if (isAPIError(error) && error.body?.code === "EMAIL_ALREADY_VERIFIED") {
      throw new ApiError("EMAIL_ALREADY_VERIFIED");
    }
    if (isAPIError(error) && error.body?.code === "EMAIL_MISMATCH") {
      throw new ApiError("FORBIDDEN");
    }
    throw error;
  }
}

/**
 * Password guesses of one IP + email pair (spec, section 7), shared by
 * sign-in and the profile. A try is counted before the password is checked,
 * so guesses sent at once cannot slip past the limit; the tenth failure
 * locks the pair out for 15 minutes, and a success starts over.
 */
export async function passwordTry(ip: string, email: string) {
  const subject = `${ip}|${email}`;
  const lockedFor = await lockSecondsLeft("signIn", subject);
  if (lockedFor > 0) {
    throw new ApiError("RATE_LIMITED", { retryAfterSeconds: lockedFor });
  }
  const tries = await hitRateLimit("signInTries", subject);
  if (!tries.allowed) {
    await lock("signIn", subject);
    throw new ApiError("RATE_LIMITED", { retryAfterSeconds: locks.signIn });
  }
  return {
    passed: () => resetRateLimit("signInTries", subject),
    failed: async () => {
      if (tries.remaining === 0) await lock("signIn", subject);
    },
  };
}

/**
 * Signs a player in. A wrong address and a wrong password get the same
 * answer.
 */
export async function signIn(
  input: SignInInput,
  request: { headers: Headers; ip: string },
) {
  const attempt = await passwordTry(request.ip, input.email);
  try {
    const { headers, response } = await auth.api.signInEmail({
      body: { email: input.email, password: input.password },
      headers: request.headers,
      returnHeaders: true,
    });
    await attempt.passed();
    return { user: response.user, cookies: headers.getSetCookie() };
  } catch (error) {
    if (!isAPIError(error)) throw error;
    if (error.body?.code === "BANNED_USER") {
      // The message says why and until when (lib/server/ban.ts).
      throw new ApiError("BANNED", { message: error.body.message });
    }
    await attempt.failed();
    throw new ApiError("INVALID_CREDENTIALS");
  }
}
