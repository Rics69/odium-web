import "server-only";

/**
 * Who is asking, for rate limits: the visitor's IPv4 address, or the /64
 * network of an IPv6 one (a provider gives a home or a phone a whole /64,
 * so its single addresses are free to change).
 *
 * The address comes from X-Forwarded-For only. In production nothing but
 * Caddy reaches the app, and Caddy writes the address it sees there,
 * dropping whatever the client sent. Without a proxy (development, e2e)
 * Next.js fills the header with the socket address itself. If a proxy is
 * ever put in front of Caddy, it appends its own entry: the last one is
 * always from the nearest proxy, so it is the one we trust.
 */
export function clientIp(headers: Headers): string {
  const address = headers
    .get("x-forwarded-for")
    ?.split(",")
    .at(-1)
    ?.trim()
    // An IPv4 visitor of a dual-stack socket: ::ffff:203.0.113.5
    .replace(/^::ffff:(?=\d+\.\d+\.\d+\.\d+$)/i, "");
  if (!address) return "unknown";
  return address.includes(":") ? ipv6Network(address) : address;
}

/** "2001:db8:1:2:3:4:5:6" and "2001:db8:1:2::9" → "2001:db8:1:2::/64". */
function ipv6Network(address: string): string {
  const [head = "", tail] = address.split("%")[0]!.split("::");
  const left = head ? head.split(":") : [];
  const right = tail ? tail.split(":") : [];
  const groups =
    tail === undefined
      ? left
      : [
          ...left,
          ...Array<string>(Math.max(0, 8 - left.length - right.length)).fill(
            "0",
          ),
          ...right,
        ];
  const prefix = groups
    .slice(0, 4)
    .map((group) => parseInt(group || "0", 16).toString(16));
  return `${prefix.join(":")}::/64`;
}
