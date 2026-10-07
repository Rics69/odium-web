// Content-Security-Policy for pages (spec, section 7). proxy.ts builds it per
// request with a fresh nonce; Next.js puts that nonce on its own scripts.

type CspOptions = {
  nonce: string;
  // Development needs eval (React's error stacks) and the reload socket.
  dev: boolean;
  // Served over HTTPS: upgrade any stray http:// request.
  https: boolean;
};

export function contentSecurityPolicy({ nonce, dev, https }: CspOptions) {
  const directives: Record<string, string[]> = {
    "default-src": ["'self'"],
    "script-src": [
      "'self'",
      `'nonce-${nonce}'`,
      "'strict-dynamic'",
      ...(dev ? ["'unsafe-eval'"] : []),
    ],
    // React and Motion write style attributes, and nonces cannot cover
    // attributes. CSS cannot run code, so inline styles stay allowed.
    "style-src": ["'self'", "'unsafe-inline'"],
    // YouTube trailer previews (lib/trailer.ts).
    "img-src": ["'self'", "data:", "blob:", "https://i.ytimg.com"],
    "font-src": ["'self'"],
    "connect-src": ["'self'", ...(dev ? ["ws:"] : [])],
    // Trailer players (lib/trailer.ts).
    "frame-src": [
      "https://www.youtube-nocookie.com",
      "https://vkvideo.ru",
      "https://vk.com",
      "https://vk.ru",
    ],
    "object-src": ["'none'"],
    "base-uri": ["'self'"],
    "form-action": ["'self'"],
    "frame-ancestors": ["'none'"],
  };

  const policy = Object.entries(directives).map(
    ([name, values]) => `${name} ${values.join(" ")}`,
  );
  if (https) policy.push("upgrade-insecure-requests");
  return policy.join("; ");
}
