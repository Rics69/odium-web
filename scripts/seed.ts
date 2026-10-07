// npm run db:seed: fills the development database with the test content
// from seed-data.ts. Safe to run again.
import { rm } from "node:fs/promises";
import nextEnv from "@next/env";

// @next/env is CommonJS: tsx gives it as a default export only.
nextEnv.loadEnvConfig(process.cwd(), true);

const { db, pool } = await import("@/lib/db");
const { seedDatabase, testGames } = await import("./seed-data");

await seedDatabase(db);

// Next.js caches these reads in memory and on disk. Drop the files (for the
// next start) and ask a running dev server to drop the rest.
for (const folder of [
  ".next/dev/cache/fetch-cache",
  ".next/cache/fetch-cache",
]) {
  await rm(folder, { recursive: true, force: true });
}
const revalidated = await fetch(
  new URL("/api/dev/revalidate", process.env.SITE_URL),
  {
    method: "POST",
  },
).then(
  (response) => response.ok,
  () => false,
);

console.log(
  `Seeded ${testGames.length} games (${testGames.filter((g) => g.published).length} published) and the studio info.`,
  revalidated ? "The running dev server dropped its cache." : "",
);
await pool.end();
