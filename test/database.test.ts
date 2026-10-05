import { sql } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import { db } from "@/lib/db";
import { testDatabaseName } from "./database";

describe("test database", () => {
  it("is migrated: trigram similarity works", async () => {
    const { rows } = await db.execute<{ score: number }>(
      sql`select similarity('пожелание', 'пожелания') as score`,
    );
    expect(rows[0]?.score).toBeGreaterThan(0.5);
  });

  it("refuses a database that is not a test one", () => {
    expect(() =>
      testDatabaseName("postgres://odium:odium@localhost:5432/odium"),
    ).toThrow(/_test/);
    expect(
      testDatabaseName("postgres://odium:odium@localhost:5432/odium_test"),
    ).toBe("odium_test");
  });
});
