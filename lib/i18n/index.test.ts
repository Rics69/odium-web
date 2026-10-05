import { describe, expect, it } from "vitest";
import { formatPlural, formatRelativeTime, t } from "./index";

describe("t", () => {
  it("returns the text by key and fills placeholders", () => {
    expect(t("nav.games")).toBe("Игры");
    expect(t("footer.copyright", { year: 2026 })).toBe("© 2026 Odium");
  });
});

describe("formatPlural", () => {
  const votes = {
    one: "{count} голос",
    few: "{count} голоса",
    many: "{count} голосов",
    other: "{count} голоса",
  };

  it.each([
    [1, "1 голос"],
    [2, "2 голоса"],
    [5, "5 голосов"],
    [11, "11 голосов"],
    [21, "21 голос"],
    [22, "22 голоса"],
    [25, "25 голосов"],
    [0, "0 голосов"],
    [1.5, "1.5 голоса"],
  ])("%d → %s", (count, expected) => {
    expect(formatPlural(count, votes)).toBe(expected);
  });
});

describe("formatRelativeTime", () => {
  const now = new Date("2026-10-05T12:00:00Z");
  const ago = (seconds: number) => new Date(now.getTime() - seconds * 1000);

  it.each([
    [10, "только что"],
    [5 * 60, "5 минут назад"],
    [3 * 60 * 60, "3 часа назад"],
    [24 * 60 * 60, "вчера"],
    [3 * 24 * 60 * 60, "3 дня назад"],
    [14 * 24 * 60 * 60, "2 недели назад"],
    [61 * 24 * 60 * 60, "2 месяца назад"],
    [-2 * 60 * 60, "через 2 часа"],
  ])("%d seconds ago → %s", (seconds, expected) => {
    expect(formatRelativeTime(ago(seconds), now)).toBe(expected);
  });
});
