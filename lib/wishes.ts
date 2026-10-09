/**
 * A wish title as the duplicate check sees it (spec, section 7): any case,
 * ё as е, one space between words. ё splits into е and a diaeresis in
 * Unicode's decomposed form; dropping the diaeresis leaves е.
 */
export function normalizeTitle(title: string): string {
  return title
    .toLowerCase()
    .normalize("NFD")
    .replace(/̈/g, "")
    .normalize("NFC")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * The first stop word found in a text, or null. Whole words only, after the
 * same normalization as titles; a stop phrase of several words matches as
 * a phrase. So "хер" does not catch "Херсон".
 */
export function findStopWord(text: string, stopWords: string[]): string | null {
  const normalized = ` ${normalizeTitle(text)
    .split(/[^\p{L}\p{N}]+/u)
    .filter(Boolean)
    .join(" ")} `;
  for (const word of stopWords) {
    const phrase = normalizeTitle(word);
    if (phrase && normalized.includes(` ${phrase} `)) return word;
  }
  return null;
}
