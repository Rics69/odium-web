import { describe, expect, it } from "vitest";
import { normalizeTitle } from "./wishes";

describe("normalizeTitle", () => {
  it("ignores case, ё and extra spaces", () => {
    expect(normalizeTitle("  Ещё   больше\tУРОВНЕЙ ")).toBe(
      normalizeTitle("еще больше уровней"),
    );
    expect(normalizeTitle("Ёлка")).toBe("елка");
  });

  it("keeps й and other letters as they are", () => {
    expect(normalizeTitle("Новый Мир")).toBe("новый мир");
  });
});
