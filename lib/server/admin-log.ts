import "server-only";
import type { AdminActionName, AdminTarget } from "@/lib/admin-actions";
import { db } from "@/lib/db";
import { adminLog } from "@/lib/db/schema";
import type { CurrentUser } from "./session";

/** A transaction an admin action runs in. */
export type AdminTransaction = Parameters<
  Parameters<typeof db.transaction>[0]
>[0];

export type AdminLogEntry = {
  /** What was done, from the list in lib/admin-actions.ts. */
  action: AdminActionName;
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

/** JSON with object keys sorted: Postgres keeps jsonb keys in its own order. */
function stable(value: unknown): string {
  return JSON.stringify(value, (_key, item: unknown) =>
    item && typeof item === "object" && !Array.isArray(item)
      ? Object.fromEntries(
          Object.entries(item).sort(([a], [b]) => a.localeCompare(b)),
        )
      : item,
  );
}

/**
 * The fields of `after` that differ from `before`, as they were and as
 * they became: what a form's save puts in the journal.
 */
export function changedFields<T extends Record<string, unknown>>(
  before: Partial<T>,
  after: T,
): { was: Record<string, unknown>; now: Record<string, unknown> } {
  const was: Record<string, unknown> = {};
  const now: Record<string, unknown> = {};
  for (const key of Object.keys(after)) {
    if (stable(before[key]) !== stable(after[key])) {
      was[key] = before[key];
      now[key] = after[key];
    }
  }
  return { was, now };
}
