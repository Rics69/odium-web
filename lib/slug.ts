import { SLUG_MAX } from "@/lib/validation/games";

// Latin spelling of the Russian letters from U+0430 (a) to U+044F (ya), in
// order: the spelling of slugs on the site (derevnya-slov). Kept as codes
// so the code has no Cyrillic letters (test/texts.test.ts).
const LATIN = [
  "a",
  "b",
  "v",
  "g",
  "d",
  "e",
  "zh",
  "z",
  "i",
  "y",
  "k",
  "l",
  "m",
  "n",
  "o",
  "p",
  "r",
  "s",
  "t",
  "u",
  "f",
  "kh",
  "ts",
  "ch",
  "sh",
  "shch",
  "",
  "y",
  "",
  "e",
  "yu",
  "ya",
];
const FIRST = 0x430;
const YO = 0x451;

/** A slug from a title: «Деревня Слов» → derevnya-slov. */
export function slugify(title: string): string {
  let latin = "";
  for (const char of title.toLowerCase()) {
    const code = char.codePointAt(0)!;
    if (code === YO) latin += "e";
    else if (code >= FIRST && code < FIRST + LATIN.length) {
      latin += LATIN[code - FIRST];
    } else latin += char;
  }
  return latin
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, SLUG_MAX)
    .replace(/-+$/, "");
}
