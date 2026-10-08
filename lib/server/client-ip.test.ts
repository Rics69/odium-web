import { describe, expect, it } from "vitest";
import { clientIp } from "./client-ip";

const forwardedFor = (value: string) =>
  clientIp(new Headers({ "x-forwarded-for": value }));

describe("client IP", () => {
  it("takes the address the nearest proxy wrote", () => {
    expect(forwardedFor("203.0.113.5")).toBe("203.0.113.5");
    // The first entry came from the client and may be anything.
    expect(forwardedFor("1.2.3.4, 203.0.113.5")).toBe("203.0.113.5");
  });

  it("unwraps IPv4 addresses written as IPv6", () => {
    expect(forwardedFor("::ffff:127.0.0.1")).toBe("127.0.0.1");
  });

  it("counts an IPv6 address as its /64 network", () => {
    expect(forwardedFor("2001:db8:1:2:3:4:5:6")).toBe("2001:db8:1:2::/64");
    expect(forwardedFor("2001:db8:1:2::9")).toBe("2001:db8:1:2::/64");
    expect(forwardedFor("2001:0db8::1")).toBe("2001:db8:0:0::/64");
    expect(forwardedFor("::1")).toBe("0:0:0:0::/64");
    expect(forwardedFor("fe80::1%eth0")).toBe("fe80:0:0:0::/64");
  });

  it("falls back to one shared key without the header", () => {
    expect(clientIp(new Headers())).toBe("unknown");
    expect(forwardedFor(" ")).toBe("unknown");
  });
});
