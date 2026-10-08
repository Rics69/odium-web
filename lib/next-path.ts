const BASE = "http://odium.invalid";

/**
 * A ?next= address to return to, only if it is a page of this site:
 * otherwise a link to sign in could lead a player to someone else's site
 * (//evil.example, https://evil.example). Anything else gives "/".
 */
export function safeNextPath(next: string | null | undefined): string {
  if (!next || !next.startsWith("/")) return "/";
  try {
    const url = new URL(next, BASE);
    if (url.origin !== BASE) return "/";
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return "/";
  }
}
