import { sql } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import { db } from "@/lib/db";
import { wishes } from "@/lib/db/schema";
import { seedDatabase, testWishes } from "./seed-data";

describe("the seed", () => {
  it("can run again and keeps every counter equal to the votes", async () => {
    await seedDatabase(db);
    await seedDatabase(db);

    expect(await db.$count(wishes)).toBe(testWishes.length);
    const { rows } = await db.execute<{ off: number }>(sql`
      select count(*)::int as off from wishes w
      where w.votes_count <> (select count(*) from votes v where v.wish_id = w.id)
    `);
    expect(rows[0]?.off).toBe(0);
  });

  it("covers every type and status, hidden wishes and a deleted author", () => {
    const statuses = new Set(testWishes.map((wish) => wish.status ?? "new"));
    expect([...statuses].sort()).toEqual(
      ["declined", "done", "in_progress", "new", "planned", "review"].sort(),
    );
    expect(new Set(testWishes.map((wish) => wish.type))).toEqual(
      new Set(["add", "remove"]),
    );
    expect(testWishes.some((wish) => wish.hiddenReason === "flagged")).toBe(
      true,
    );
    expect(testWishes.some((wish) => wish.author === null)).toBe(true);
  });
});
