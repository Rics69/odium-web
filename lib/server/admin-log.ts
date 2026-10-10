import "server-only";
import { db } from "@/lib/db";
import { adminLog } from "@/lib/db/schema";
import type { CurrentUser } from "./session";

/** A transaction an admin action runs in. */
export type AdminTransaction = Parameters<
  Parameters<typeof db.transaction>[0]
>[0];

/** What an admin acts on (spec, section 6). */
export type AdminTarget =
  "wish" | "user" | "game" | "studio" | "stop_words" | "blocked_domains";

export type AdminLogEntry = {
  /** What was done, as `<target>.<verb>`: "wish.hide", "user.ban". */
  action: `${AdminTarget}.${string}`;
  targetType: AdminTarget;
  targetId: string;
  /** The changed fields as they were and as they became. */
  before?: Record<string, unknown> | null;
  after?: Record<string, unknown> | null;
  reason?: string | null;
};

export type RecordAction = (entry: AdminLogEntry) => Promise<void>;

/**
 * Runs an admin action and its journal record in one transaction (spec,
 * section 6): `record` writes the entry next to the change, so either both
 * stay or neither does. Every admin action goes through here.
 */
export function adminAction<T>(
  admin: Pick<CurrentUser, "id">,
  run: (tx: AdminTransaction, record: RecordAction) => Promise<T>,
): Promise<T> {
  return db.transaction((tx) =>
    run(tx, async (entry) => {
      await tx.insert(adminLog).values({
        adminId: admin.id,
        action: entry.action,
        targetType: entry.targetType,
        targetId: entry.targetId,
        before: entry.before ?? null,
        after: entry.after ?? null,
        reason: entry.reason ?? null,
      });
    }),
  );
}
