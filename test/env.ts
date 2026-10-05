import { readFileSync } from "node:fs";
import { parseEnv } from "node:util";

// Variables for Vitest and Playwright, read explicitly so that tests never
// pick up the developer's .env.local.
const parsed = parseEnv(
  readFileSync(new URL("../.env.test", import.meta.url), "utf8"),
) as Record<string, string | undefined>;

const databaseUrl = parsed.DATABASE_URL;
if (!databaseUrl) {
  throw new Error("DATABASE_URL is missing in .env.test");
}

export const testEnv = { ...parsed, DATABASE_URL: databaseUrl };
