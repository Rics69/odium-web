import { prepareTestDatabase } from "./database";
import { testEnv } from "./env";

// Shared by Vitest and Playwright: the test database exists and is migrated.
export default async function globalSetup() {
  await prepareTestDatabase(testEnv.DATABASE_URL);
}
