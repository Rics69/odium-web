import { sql } from "drizzle-orm";
import { beforeEach } from "vitest";
import { db } from "@/lib/db";
import { env } from "@/lib/env";
import { testDatabaseName } from "./database";

testDatabaseName(env.DATABASE_URL);

// Every test starts from empty tables; the schema and migration history stay.
beforeEach(async () => {
  const { rows } = await db.execute<{ tablename: string }>(
    sql`select tablename from pg_tables where schemaname = 'public'`,
  );
  if (rows.length > 0) {
    const tables = rows.map((row) => `"public"."${row.tablename}"`).join(", ");
    await db.execute(
      sql.raw(`truncate table ${tables} restart identity cascade`),
    );
  }
});
