import { describe, expect, it } from "vitest";
import { db } from "@/lib/db";
import { studioInfo } from "@/lib/db/schema";
import { queryStudioInfo } from "./studio";

describe("studio info", () => {
  it("is null until the row exists", async () => {
    expect(await queryStudioInfo()).toBeNull();
  });

  it("reads the single row", async () => {
    await db.insert(studioInfo).values({
      mission: "Mission",
      socials: [{ label: "Telegram", url: "https://t.me/odium_games" }],
    });

    expect(await queryStudioInfo()).toMatchObject({
      mission: "Mission",
      socials: [{ label: "Telegram", url: "https://t.me/odium_games" }],
    });
  });

  it("refuses a second row", async () => {
    await expect(db.insert(studioInfo).values({ id: 2 })).rejects.toThrow();
  });
});
