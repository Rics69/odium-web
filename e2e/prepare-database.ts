// Runs before the e2e server starts (see webServer in playwright.config.ts):
// migrates the test database, adds the test content and drops reads that
// earlier runs cached. It has to come first: Playwright opens the home page
// to check the server is up, and that caches whatever the database holds.
import { rm } from "node:fs/promises";
import { drizzle } from "drizzle-orm/node-postgres";
import { Client } from "pg";
import { seedDatabase } from "../scripts/seed-data";
import { prepareTestDatabase } from "../test/database";
import { testEnv } from "../test/env";

await prepareTestDatabase(testEnv.DATABASE_URL);

const client = new Client({ connectionString: testEnv.DATABASE_URL });
await client.connect();
try {
  await seedDatabase(drizzle({ client, casing: "snake_case" }));
} finally {
  await client.end();
}

await rm(".next/cache/fetch-cache", { recursive: true, force: true });
console.log("e2e database ready");
