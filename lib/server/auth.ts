import "server-only";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { admin } from "better-auth/plugins/admin";
import { db } from "@/lib/db";
import * as schema from "@/lib/db/schema";
import { env } from "@/lib/env";
import { banMessage } from "./ban";
import {
  sendChangeEmailVerification,
  sendEmailChangeNotice,
  sendPasswordResetEmail,
  sendVerificationEmail,
} from "./mail/letters";

const DAY = 24 * 60 * 60;

/**
 * Confirmation letters. A change of address comes here too: its token
 * carries the new address (updateTo). Then the new address gets "confirm
 * the new address" and the old one a warning (spec, section 7).
 */
async function sendConfirmation({
  user,
  url,
  token,
}: {
  user: { name: string; email: string };
  url: string;
  token: string;
}) {
  const { email: oldEmail, updateTo } = tokenPayload(token);
  if (!updateTo || !oldEmail) {
    return sendVerificationEmail({ to: user.email, nickname: user.name, url });
  }
  await Promise.all([
    sendChangeEmailVerification({ to: updateTo, nickname: user.name, url }),
    sendEmailChangeNotice({
      to: oldEmail,
      nickname: user.name,
      newEmail: updateTo,
    }),
  ]);
}

// The token is Better Auth's signed JWT; reading it is enough here, it is
// checked when the link is opened.
function tokenPayload(token: string): { email?: string; updateTo?: string } {
  try {
    return JSON.parse(
      Buffer.from(token.split(".")[1] ?? "", "base64url").toString("utf8"),
    ) as { email?: string; updateTo?: string };
  } catch {
    return {};
  }
}

// Roles and bans. Admins act through our own /api/admin/* (phase 4), which
// writes every action to the log, so the plugin's HTTP endpoints stay
// closed; its functions on `auth.api` still work on the server.
// A banned player sees why and until when, and only after the right
// password, so a ban does not reveal who is registered.
const adminPlugin = admin({ bannedUserMessage: banMessage });
const adminEndpointPaths = Object.values(adminPlugin.endpoints).map(
  (endpoint) => endpoint.path,
);

/**
 * Accounts and sessions (Better Auth). Its routes live under /api/auth;
 * the rest of the site checks rights through lib/server/session.ts.
 */
export const auth = betterAuth({
  appName: "Odium",
  baseURL: env.SITE_URL,
  secret: env.BETTER_AUTH_SECRET,
  database: drizzleAdapter(db, { provider: "pg", schema }),
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 8,
    // A reset link lives an hour and works once; the new password signs
    // the player out everywhere (spec, section 7).
    resetPasswordTokenExpiresIn: 60 * 60,
    revokeSessionsOnPasswordReset: true,
    sendResetPassword: ({ user, url }) =>
      sendPasswordResetEmail({ to: user.email, nickname: user.name, url }),
  },
  // One-time tokens are kept as hashes: a copy of the database gives no
  // working reset links.
  verification: { storeIdentifier: "hashed" },
  // Signed in right after sign-up, but posting and voting wait for the
  // confirmation (spec, section 3). The link lives a day; opened on another
  // device it signs the player in there too.
  emailVerification: {
    sendOnSignUp: true,
    autoSignInAfterVerification: true,
    expiresIn: DAY,
    sendVerificationEmail: sendConfirmation,
  },
  // Better Auth calls it `name`; for us it is the player's nickname.
  // A new address takes over only once confirmed (step 2.7).
  user: { fields: { name: "nickname" }, changeEmail: { enabled: true } },
  // 30 days, extended at most once a day while the player keeps coming back.
  session: { expiresIn: 30 * DAY, updateAge: DAY },
  // One set of limits for the whole site: ours, lib/server/limits.ts.
  rateLimit: { enabled: false },
  advanced: {
    database: { generateId: "uuid" },
    cookiePrefix: "odium",
    // Secure wherever the site runs on HTTPS; plain HTTP is only the dev
    // server and e2e, where a Secure cookie would not come back.
    useSecureCookies: env.SITE_URL.startsWith("https://"),
    defaultCookieAttributes: { httpOnly: true, sameSite: "lax" },
    // Letters after sign-up go out without holding the answer; a failed one
    // is logged, and the player can ask for it again.
    backgroundTasks: {
      handler: (task) => {
        task.catch((error: unknown) =>
          console.error("Better Auth background task failed", error),
        );
      },
    },
  },
  // In development the site is also opened by IP from a phone.
  trustedOrigins:
    env.NODE_ENV === "development"
      ? (request) => [request && `http://${request.headers.get("host")}`]
      : [],
  plugins: [adminPlugin],
  // Our routes with our checks and limits stand in for these:
  // /api/auth/sign-up and /api/auth/send-verification-email (step 2.4),
  // /api/auth/sign-in (step 2.5), /api/auth/request-password-reset and
  // /api/auth/reset-password (step 2.6), nickname changes through
  // PATCH /api/me (step 2.7). The link from a reset letter still opens
  // Better Auth's /reset-password/:token, which checks it.
  disabledPaths: [
    ...adminEndpointPaths,
    "/sign-up/email",
    "/sign-in/email",
    "/request-password-reset",
    "/reset-password",
    "/send-verification-email",
    "/update-user",
  ],
  telemetry: { enabled: false },
});
