import { describe, expect, it } from "vitest";
import { findStopWord, normalizeTitle } from "./wishes";

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

describe("findStopWord", () => {
  const words = ["казино", "дёшево купить"];

  it("finds whole words in any case and with ё", () => {
    expect(findStopWord("Лучшее КАЗИНО тут", words)).toBe("казино");
    // Punctuation between the words of a phrase does not matter.
    expect(findStopWord("Монеты: дешево, купить!", words)).toBe(
      "дёшево купить",
    );
    expect(findStopWord("Где ДЕШЕВО   купить монеты", words)).toBe(
      "дёшево купить",
    );
  });

  it("does not catch a word inside another", () => {
    expect(findStopWord("Казиноленд — новая карта", words)).toBeNull();
  });
});
