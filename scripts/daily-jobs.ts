// npm run jobs:daily
//
// The daily jobs once (step 4.8): purge wishes deleted 30 days ago, delete
// accounts unconfirmed for 7 days, clean old limit windows, expired
// sessions and links, fix vote counters, remove unused images. On the
// server the jobs service of compose.yml runs it at start and then every
// 24 hours.
import nextEnv from "@next/env";

nextEnv.loadEnvConfig(process.cwd(), true);

const { pool } = await import("@/lib/db");
const { runDailyJobs } = await import("@/lib/server/jobs");

const report = await runDailyJobs();
if (!report) {
  console.log("Another runner is at work: skipped.");
} else {
  for (const line of report) {
    console.log(
      line.error ? `${line.task}: FAILED` : `${line.task}: ${line.count}`,
    );
  }
}
await pool.end();
process.exit(report?.some((line) => line.error) ? 1 : 0);
