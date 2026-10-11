import "server-only";
import { db } from "@/lib/db";
import {
  cleanExpired,
  cleanRateLimits,
  deleteUnconfirmedAccounts,
  purgeDeletedWishes,
  reconcileVotes,
  removeUnusedImages,
} from "./tasks";

// Any number, the same for every runner: two at once would do the work twice.
const LOCK = 4_829_301;

export type Task = [name: string, run: (now: Date) => Promise<number>];

const tasks: Task[] = [
  ["deleted wishes purged", purgeDeletedWishes],
  ["unconfirmed accounts deleted", deleteUnconfirmedAccounts],
  ["old limit windows removed", cleanRateLimits],
  ["expired sessions and links removed", cleanExpired],
  ["vote counters fixed", reconcileVotes],
  ["unused images removed", removeUnusedImages],
];

export type JobsReport = { task: string; count?: number; error?: string }[];

/** Runs tasks one after another; a failed one is logged, the rest go on. */
export async function runTasks(list: Task[], now: Date): Promise<JobsReport> {
  const report: JobsReport = [];
  for (const [task, run] of list) {
    try {
      report.push({ task, count: await run(now) });
    } catch (error) {
      console.error(`Daily job "${task}" failed`, error);
      report.push({ task, error: String(error) });
    }
  }
  return report;
}

/**
 * The daily jobs (spec, sections 5, 7 and 8), one after another. A task
 * that fails is logged and the others still run. Runs only if no other
 * runner holds the lock; then returns null.
 */
export async function runDailyJobs(
  now = new Date(),
): Promise<JobsReport | null> {
  const client = await db.$client.connect();
  try {
    const { rows } = await client.query<{ locked: boolean }>(
      "select pg_try_advisory_lock($1) as locked",
      [LOCK],
    );
    if (!rows[0]?.locked) return null;
    try {
      return await runTasks(tasks, now);
    } finally {
      await client.query("select pg_advisory_unlock($1)", [LOCK]);
    }
  } finally {
    client.release();
  }
}
