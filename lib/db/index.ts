import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { env } from "@/lib/env";
import * as schema from "./schema";

// One pool per process. In development every hot reload re-evaluates this
// module, so the pool is kept on globalThis instead of leaking connections.
const globalForDb = globalThis as unknown as { pgPool?: Pool };

export const pool =
  globalForDb.pgPool ??
  new Pool({
    connectionString: env.DATABASE_URL,
    // Without a timeout a request waits forever when the database is down.
    connectionTimeoutMillis: 5_000,
  });

if (env.NODE_ENV !== "production") {
  globalForDb.pgPool = pool;
}

// TypeScript keys are camelCase, database columns snake_case (as in the spec).
export const db = drizzle({ client: pool, schema, casing: "snake_case" });
