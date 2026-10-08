// The heart of `npm run create-admin`, apart from the command line so the
// tests can run it.
import { randomBytes } from "node:crypto";
import { hashPassword } from "better-auth/crypto";
import { eq, sql } from "drizzle-orm";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import { account, session, user } from "@/lib/db/schema";
import { emailSchema, nicknameFormatSchema } from "@/lib/validation/account";

export type CreateAdminResult =
  | { status: "promoted"; nickname: string }
  | { status: "already-admin"; nickname: string }
  | { status: "created"; nickname: string; password: string };

/**
 * Makes the owner of an email an admin with a confirmed email. A new
 * account gets a random password, shown once: it is never typed on the
 * command line, where the shell history would keep it. Admins may take the
 * studio's nicknames (Odium, Moderator) that players cannot.
 */
export async function createAdmin(
  db: NodePgDatabase<Record<string, unknown>>,
  input: { email: string; nickname?: string },
): Promise<CreateAdminResult> {
  const email = emailSchema.parse(input.email);
  const [existing] = await db
    .select({ id: user.id, nickname: user.nickname, role: user.role })
    .from(user)
    .where(eq(user.email, email));

  if (existing) {
    if (existing.role === "admin") {
      return { status: "already-admin", nickname: existing.nickname };
    }
    await db.transaction(async (tx) => {
      await tx
        .update(user)
        .set({ role: "admin", emailVerified: true, banned: false })
        .where(eq(user.id, existing.id));
      // Sessions started as a player sign in again, now as an admin.
      await tx.delete(session).where(eq(session.userId, existing.id));
    });
    return { status: "promoted", nickname: existing.nickname };
  }

  const nickname = nicknameFormatSchema.parse(input.nickname ?? "Odium");
  const [taken] = await db
    .select({ id: user.id })
    .from(user)
    .where(sql`lower(${user.nickname}) = lower(${nickname})`);
  if (taken) {
    throw new Error(`Ник «${nickname}» занят — выберите другой: --nickname …`);
  }

  const password = randomBytes(18).toString("base64url");
  const passwordHash = await hashPassword(password);
  await db.transaction(async (tx) => {
    const [created] = await tx
      .insert(user)
      .values({ email, nickname, role: "admin", emailVerified: true })
      .returning({ id: user.id });
    // The way Better Auth keeps an email-and-password sign-in.
    await tx.insert(account).values({
      userId: created!.id,
      accountId: created!.id,
      providerId: "credential",
      password: passwordHash,
    });
  });
  return { status: "created", nickname, password };
}
