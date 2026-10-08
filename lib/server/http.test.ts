import { NextRequest } from "next/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { db } from "@/lib/db";
import { rateLimits } from "@/lib/db/schema";
import { ApiError, apiRoute } from "./http";
import { limits } from "./limits";

const URL_BASE = "http://localhost:3000";

function call(
  handler: ReturnType<typeof apiRoute>,
  {
    path = "/api/test",
    method = "GET",
    headers = {},
    body,
    params = {},
  }: {
    path?: string;
    method?: string;
    headers?: Record<string, string>;
    body?: string;
    params?: Record<string, string>;
  } = {},
) {
  const request = new NextRequest(`${URL_BASE}${path}`, {
    method,
    headers: {
      host: "localhost:3000",
      "x-forwarded-for": "203.0.113.5",
      ...headers,
    },
    body,
  });
  return handler(request, { params: Promise.resolve(params) });
}

const sameOrigin = { origin: URL_BASE, "content-type": "application/json" };

afterEach(() => {
  vi.useRealTimers();
});

describe("apiRoute", () => {
  it("answers with what the handler returns, as JSON", async () => {
    const handler = apiRoute({}, async () => ({ games: [] }));

    const response = await call(handler);

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ games: [] });
  });

  it("parses params, query and body with their schemas", async () => {
    const handler = apiRoute(
      {
        params: z.object({ slug: z.string() }),
        query: z.object({ sort: z.enum(["new", "top"]) }),
        body: z.object({ title: z.string().min(3) }),
      },
      async ({ params, query, body }) => ({ params, query, body }),
    );

    const response = await call(handler, {
      path: "/api/test?sort=top",
      method: "POST",
      headers: sameOrigin,
      body: JSON.stringify({ title: "Больше уровней" }),
      params: { slug: "village" },
    });

    expect(await response.json()).toEqual({
      params: { slug: "village" },
      query: { sort: "top" },
      body: { title: "Больше уровней" },
    });
  });

  it("answers 400 with a message per field when the input is wrong", async () => {
    const handler = apiRoute(
      {
        body: z.object({
          title: z.string().min(3, "Too short"),
          details: z.object({ text: z.string() }),
        }),
      },
      async () => ({}),
    );

    const response = await call(handler, {
      method: "POST",
      headers: sameOrigin,
      body: JSON.stringify({ title: "Hi", details: {} }),
    });

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({
      error: {
        code: "VALIDATION_ERROR",
        message: "Проверьте, что всё заполнено правильно.",
        fields: { title: "Too short", "details.text": expect.any(String) },
      },
    });
  });

  it("answers 400 when the body is not JSON", async () => {
    const handler = apiRoute(
      { body: z.object({ title: z.string() }) },
      async () => ({}),
    );

    const response = await call(handler, {
      method: "POST",
      headers: sameOrigin,
      body: "title=hello",
    });

    expect(response.status).toBe(400);
    expect((await response.json()).error.code).toBe("VALIDATION_ERROR");
  });

  it("answers 404 when route params do not fit", async () => {
    const handler = apiRoute(
      { params: z.object({ slug: z.string().regex(/^[a-z-]+$/) }) },
      async () => ({}),
    );

    const response = await call(handler, { params: { slug: "../etc" } });

    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({
      error: { code: "NOT_FOUND", message: "Ничего не нашлось." },
    });
  });

  describe("Origin check", () => {
    const handler = apiRoute({}, async () => ({ done: true }));

    it("lets changing requests from the site itself through", async () => {
      for (const method of ["POST", "PUT", "PATCH", "DELETE"]) {
        const response = await call(handler, { method, headers: sameOrigin });
        expect(response.status).toBe(200);
      }
    });

    it("works when the site is opened by IP from a phone", async () => {
      const response = await call(handler, {
        method: "POST",
        headers: {
          host: "192.168.1.237:3000",
          origin: "http://192.168.1.237:3000",
        },
      });
      expect(response.status).toBe(200);
    });

    it.each([
      ["another site", { origin: "https://evil.example" }],
      ["another port", { origin: "http://localhost:4000" }],
      ["a null origin", { origin: "null" }],
      ["no origin", {}],
    ])("refuses changing requests from %s", async (_, headers) => {
      const response = await call(handler, { method: "POST", headers });

      expect(response.status).toBe(403);
      expect((await response.json()).error.code).toBe("FORBIDDEN");
    });

    it("does not need Origin for reading", async () => {
      const response = await call(handler);
      expect(response.status).toBe(200);
    });
  });

  describe("API limit per IP", () => {
    const handler = apiRoute({}, async () => ({ done: true }));

    async function exhaust(ip: string) {
      vi.useFakeTimers({ toFake: ["Date"] });
      vi.setSystemTime(new Date("2026-10-08T12:00:30Z"));
      await db.insert(rateLimits).values({
        key: `api:${ip}`,
        windowStart: new Date("2026-10-08T12:00:00Z"),
        count: limits.api.max,
      });
    }

    it("answers 429 with Retry-After once the limit is used up", async () => {
      await exhaust("203.0.113.5");

      const response = await call(handler);

      expect(response.status).toBe(429);
      expect(response.headers.get("Retry-After")).toBe("30");
      expect(await response.json()).toEqual({
        error: {
          code: "RATE_LIMITED",
          message: "Слишком часто, попробуйте через 1 минуту.",
        },
      });
    });

    it("counts every IP on its own", async () => {
      await exhaust("203.0.113.5");

      const response = await call(handler, {
        headers: { "x-forwarded-for": "203.0.113.6" },
      });

      expect(response.status).toBe(200);
    });

    it("counts the request before the handler runs", async () => {
      await call(handler);
      await call(handler);

      const [row] = await db.select().from(rateLimits);
      expect(row).toMatchObject({ key: "api:203.0.113.5", count: 2 });
    });
  });

  it("answers with the code of an ApiError the handler throws", async () => {
    const handler = apiRoute({}, async () => {
      throw new ApiError("NOT_FOUND");
    });

    const response = await call(handler);

    expect(response.status).toBe(404);
    expect((await response.json()).error.code).toBe("NOT_FOUND");
  });

  it("hides unexpected errors behind a 500 and logs them", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    const handler = apiRoute({}, async () => {
      throw new Error("password=secret in a stack trace");
    });

    const response = await call(handler);

    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({
      error: {
        code: "INTERNAL_ERROR",
        message: "У нас что-то сломалось. Попробуйте ещё раз чуть позже.",
      },
    });
    expect(log).toHaveBeenCalledOnce();
  });
});

describe("rate limit message", () => {
  it.each([
    [30, "Слишком часто, попробуйте через 1 минуту."],
    [5 * 60, "Слишком часто, попробуйте через 5 минут."],
    [59 * 60, "Слишком часто, попробуйте через 59 минут."],
    [60 * 60, "Слишком часто, попробуйте через 1 час."],
    [90 * 60, "Слишком часто, попробуйте через 2 часа."],
    [20 * 60 * 60, "Слишком часто, попробуйте через 20 часов."],
  ])("after %i seconds: %s", (retryAfterSeconds, message) => {
    expect(new ApiError("RATE_LIMITED", { retryAfterSeconds }).message).toBe(
      message,
    );
  });
});
