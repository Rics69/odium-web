import { describe, expect, it, vi } from "vitest";
import { db } from "@/lib/db";
import { GET } from "./route";

describe("GET /api/health", () => {
  it("answers ok when the database responds", async () => {
    const response = await GET();
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ status: "ok" });
  });

  it("answers 503 when the database is unreachable", async () => {
    vi.spyOn(db, "execute").mockRejectedValueOnce(
      new Error("connection refused"),
    );
    vi.spyOn(console, "error").mockImplementation(() => {});

    const response = await GET();

    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({
      status: "error",
      database: "unreachable",
    });
  });
});
