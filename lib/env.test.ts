import { describe, expect, it, vi } from "vitest";

async function importEnv() {
  vi.resetModules();
  const { env } = await import("./env");
  return env;
}

describe("env", () => {
  it("reads the variables", async () => {
    vi.stubEnv("SITE_URL", "https://odium.example");
    const env = await importEnv();
    expect(env.SITE_URL).toBe("https://odium.example");
  });

  it("names a missing variable", async () => {
    vi.stubEnv("SITE_URL", undefined);
    await expect(importEnv()).rejects.toThrow(/SITE_URL/);
  });

  it("accepts only a PostgreSQL database URL", async () => {
    vi.stubEnv("DATABASE_URL", "mysql://odium:odium@localhost:3306/odium");
    await expect(importEnv()).rejects.toThrow(/DATABASE_URL/);
  });
});
