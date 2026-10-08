import { describe, expect, it } from "vitest";
import { safeNextPath } from "./next-path";

describe("safeNextPath", () => {
  it.each([
    ["/games/neon-garden/wishes", "/games/neon-garden/wishes"],
    ["/games?sort=new#top", "/games?sort=new#top"],
  ])("keeps pages of the site: %s", (next, expected) => {
    expect(safeNextPath(next)).toBe(expected);
  });

  it.each([
    undefined,
    null,
    "",
    "games",
    "https://evil.example/",
    "//evil.example/path",
    "/\\evil.example",
    "javascript:alert(1)",
  ])("sends anything else home: %s", (next) => {
    expect(safeNextPath(next)).toBe("/");
  });
});
