import "server-only";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

// Fonts for Open Graph pictures: the site's own files, Latin and Cyrillic
// as separate faces, so a family stack picks the one that has the letter.
export const OG_DISPLAY = "Unbounded Cyrillic, Unbounded Latin";
export const OG_TEXT = "Inter Cyrillic, Inter Latin";

const fontsDir = join(process.cwd(), "assets/fonts");

export async function ogFonts() {
  const [unboundedLatin, unboundedCyrillic, interLatin, interCyrillic] =
    await Promise.all(
      [
        "unbounded-latin-600-normal.woff",
        "unbounded-cyrillic-600-normal.woff",
        "inter-latin-400-normal.woff",
        "inter-cyrillic-400-normal.woff",
      ].map((file) => readFile(join(fontsDir, file))),
    );
  return [
    { name: "Unbounded Latin", data: unboundedLatin!, weight: 600 as const },
    {
      name: "Unbounded Cyrillic",
      data: unboundedCyrillic!,
      weight: 600 as const,
    },
    { name: "Inter Latin", data: interLatin!, weight: 400 as const },
    { name: "Inter Cyrillic", data: interCyrillic!, weight: 400 as const },
  ];
}
