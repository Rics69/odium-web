import "server-only";
import { eq } from "drizzle-orm";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { cache } from "react";
import { db } from "@/lib/db";
import { session as sessions, user as users } from "@/lib/db/schema";
import { auth } from "./auth";
import { ApiError } from "./http";

// Every rights check of the site goes through these helpers: pages and
// Route Handlers never look at sessions or roles themselves.

export type CurrentUser = {
  id: string;
  nickname: string;
  email: string;
  emailVerified: boolean;
  role: "user" | "admin";
  createdAt: Date;
};

/** The signed-in player, or null for a guest. */
export function getCurrentUser(headers: Headers): Promise<CurrentUser | null> {
  return currentUserByCookie(headers.get("cookie") ?? "");
}

// Keyed by the cookie, so the header and the page of one render share a
// single lookup.
const currentUserByCookie = cache(
  async (cookie: string): Promise<CurrentUser | null> => {
    if (!cookie) return null;
    const result = await auth.api.getSession({
      headers: new Headers({ cookie }),
      // Read only. Extending the session must also renew the cookie, and
      // only a response to the browser can do that: SessionKeeper asks
      // /api/auth/get-session once per visit.
      query: { disableRefresh: true },
    });
    if (!result) return null;

    const { user } = result;
    if (user.banned) {
      if (!user.banExpires || user.banExpires > new Date()) {
        // A ban signs the player out everywhere at once (spec, section 7).
        await db.delete(sessions).where(eq(sessions.userId, user.id));
        return null;
      }
      // The ban is over: lifted at the first check after it ends.
      await db
        .update(users)
        .set({ banned: false, banReason: null, banExpires: null })
        .where(eq(users.id, user.id));
    }

    return {
      id: user.id,
      nickname: user.name,
      email: user.email,
      emailVerified: user.emailVerified,
      role: user.role === "admin" ? "admin" : "user",
      createdAt: user.createdAt,
    };
  },
);

/** The signed-in player; a guest gets 401. */
export async function requireUser(headers: Headers): Promise<CurrentUser> {
  const user = await getCurrentUser(headers);
  if (!user) throw new ApiError("UNAUTHORIZED");
  return user;
}

/** A player with a confirmed email: needed to post wishes and vote. */
export async function requireVerifiedUser(
  headers: Headers,
): Promise<CurrentUser> {
  const user = await requireUser(headers);
  if (!user.emailVerified) throw new ApiError("EMAIL_NOT_VERIFIED");
  return user;
}

/** An admin; anyone else signed in gets 403. */
export async function requireAdmin(headers: Headers): Promise<CurrentUser> {
  const user = await requireUser(headers);
  if (user.role !== "admin") throw new ApiError("FORBIDDEN");
  return user;
}

/**
 * An admin page: for anyone else, a guest included, there is no such page
 * (404, spec section 6). Every admin page calls it itself: a layout is not
 * checked again when moving between the pages under it.
 */
export async function requireAdminPage(): Promise<CurrentUser> {
  const user = await getCurrentUser(await headers());
  if (user?.role !== "admin") notFound();
  return user;
}
