import "server-only";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { admin } from "better-auth/plugins/admin";
import { db } from "@/lib/db";
import * as schema from "@/lib/db/schema";
import { env } from "@/lib/env";

const DAY = 24 * 60 * 60;

// Roles and bans. Admins act through our own /api/admin/* (phase 4), which
// writes every action to the log, so the plugin's HTTP endpoints stay
// closed; its functions on `auth.api` still work on the server.
const adminPlugin = admin();
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
  },
  // Better Auth calls it `name`; for us it is the player's nickname.
  user: { fields: { name: "nickname" } },
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
  },
  // In development the site is also opened by IP from a phone.
  trustedOrigins:
    env.NODE_ENV === "development"
      ? (request) => [request && `http://${request.headers.get("host")}`]
      : [],
  plugins: [adminPlugin],
  // Nicknames change through PATCH /api/me with our checks (step 2.7).
  disabledPaths: [...adminEndpointPaths, "/update-user"],
  telemetry: { enabled: false },
});
