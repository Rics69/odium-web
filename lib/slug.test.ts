import { describe, expect, it } from "vitest";
import { slugSchema } from "@/lib/validation/games";
import { slugify } from "./slug";

describe("slugify", () => {
  it("spells Russian titles in Latin letters", () => {
    expect(slugify("Деревня Слов")).toBe("derevnya-slov");
    expect(slugify("Неоновый сад")).toBe("neonovyy-sad");
    expect(slugify("Ёжик и щука: часть 2!")).toBe("ezhik-i-shchuka-chast-2");
  });

  it("keeps Latin, drops accents and odd signs", () => {
    expect(slugify("  Café — Odium's Game  ")).toBe("cafe-odium-s-game");
  });

  it("always gives a valid slug or nothing", () => {
    for (const title of ["Подъезд", "x".repeat(80), "!!!", "Объём"]) {
      const slug = slugify(title);
      if (slug) expect(slugSchema.safeParse(slug).success, title).toBe(true);
    }
    expect(slugify("!!!")).toBe("");
  });
});
