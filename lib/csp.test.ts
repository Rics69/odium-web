import { describe, expect, it } from "vitest";
import { contentSecurityPolicy } from "./csp";

describe("contentSecurityPolicy", () => {
  it("lets only scripts with the request's nonce run", () => {
    const policy = contentSecurityPolicy({
      nonce: "abc123",
      dev: false,
      https: true,
    });

    expect(policy).toContain(
      "script-src 'self' 'nonce-abc123' 'strict-dynamic';",
    );
    expect(policy).not.toContain("unsafe-eval");
    expect(policy).toContain("frame-ancestors 'none'");
    expect(policy).toContain("object-src 'none'");
    expect(policy).toMatch(/upgrade-insecure-requests$/);
  });

  it("allows the trailer players and their previews", () => {
    const policy = contentSecurityPolicy({
      nonce: "n",
      dev: false,
      https: true,
    });

    expect(policy).toContain(
      "frame-src https://www.youtube-nocookie.com https://vkvideo.ru",
    );
    expect(policy).toContain("img-src 'self' data: blob: https://i.ytimg.com");
  });

  it("relaxes only what development needs", () => {
    const policy = contentSecurityPolicy({
      nonce: "n",
      dev: true,
      https: false,
    });

    expect(policy).toContain("'unsafe-eval'");
    expect(policy).toContain("connect-src 'self' ws:");
    expect(policy).not.toContain("upgrade-insecure-requests");
  });
});
