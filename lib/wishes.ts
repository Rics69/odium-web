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
