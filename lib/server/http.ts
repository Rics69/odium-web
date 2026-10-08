import "server-only";
import { unstable_rethrow } from "next/navigation";
import type { NextRequest } from "next/server";
import type { z } from "zod";
import { t, tp } from "@/lib/i18n";
import { clientIp } from "./client-ip";
import { hitRateLimit } from "./rate-limit";

// Error codes of the API with their HTTP statuses and texts for players
// (spec, section 9). The site shows `message` as is.
const errors = {
  VALIDATION_ERROR: { status: 400, message: () => t("errors.validation") },
  UNAUTHORIZED: { status: 401, message: () => t("errors.unauthorized") },
  INVALID_CREDENTIALS: {
    status: 401,
    message: () => t("account.login.invalid"),
  },
  FORBIDDEN: { status: 403, message: () => t("errors.forbidden") },
  BANNED: { status: 403, message: () => t("account.login.banned") },
  EMAIL_NOT_VERIFIED: {
    status: 403,
    message: () => t("errors.emailNotVerified"),
  },
  NOT_FOUND: { status: 404, message: () => t("errors.notFound") },
  NICKNAME_TAKEN: {
    status: 409,
    message: () => t("account.errors.nicknameTaken"),
  },
  EMAIL_TAKEN: { status: 409, message: () => t("account.errors.emailTaken") },
  EMAIL_ALREADY_VERIFIED: {
    status: 409,
    message: () => t("errors.emailAlreadyVerified"),
  },
  RATE_LIMITED: {
    status: 429,
    message: (retryAfterSeconds = 60) => {
      const minutes = Math.ceil(retryAfterSeconds / 60);
      return minutes < 60
        ? tp("errors.rateLimitedMinutes", minutes)
        : tp("errors.rateLimitedHours", Math.ceil(minutes / 60));
    },
  },
  INTERNAL_ERROR: { status: 500, message: () => t("errors.internal") },
} satisfies Record<
  string,
  { status: number; message: (retryAfterSeconds?: number) => string }
>;

export type ErrorCode = keyof typeof errors;

/** Field name (a dotted path for nested ones) → what is wrong with it. */
export type FieldErrors = Record<string, string>;

/** Thrown anywhere under apiRoute, it becomes the error response. */
export class ApiError extends Error {
  readonly code: ErrorCode;
  readonly fields?: FieldErrors;
  readonly retryAfterSeconds?: number;

  constructor(
    code: ErrorCode,
    options: {
      message?: string;
      fields?: FieldErrors;
      retryAfterSeconds?: number;
    } = {},
  ) {
    super(options.message ?? errors[code].message(options.retryAfterSeconds));
    this.code = code;
    this.fields = options.fields;
    this.retryAfterSeconds = options.retryAfterSeconds;
  }
}

/** { "error": { "code", "message", "fields"? } } with the code's status. */
export function errorResponse(error: ApiError): Response {
  const headers = new Headers();
  if (error.retryAfterSeconds !== undefined) {
    headers.set("Retry-After", String(error.retryAfterSeconds));
  }
  return Response.json(
    {
      error: {
        code: error.code,
        message: error.message,
        ...(error.fields && { fields: error.fields }),
      },
    },
    { status: errors[error.code].status, headers },
  );
}

type Schemas = {
  /** Route segments. A mismatch answers 404: no such thing at this address. */
  params?: z.ZodType;
  /** The query string, one value per name. */
  query?: z.ZodType;
  /** The JSON body. */
  body?: z.ZodType;
};

type Parsed<S> = S extends z.ZodType ? z.output<S> : undefined;

export type ApiInput<S extends Schemas> = {
  request: NextRequest;
  /** For per-IP limits, see clientIp. */
  ip: string;
  params: Parsed<S["params"]>;
  query: Parsed<S["query"]>;
  body: Parsed<S["body"]>;
};

const MUTATING_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);

/**
 * Wraps a Route Handler. Before `run` it counts the request against the
 * per-IP API limit, checks the Origin of changing requests and parses the
 * input with Zod. `run` returns data for a JSON response (or a Response),
 * and throws ApiError for an error one. Anything else thrown is logged and
 * answers 500 without details.
 */
export function apiRoute<S extends Schemas>(
  schemas: S,
  run: (input: ApiInput<S>) => Promise<unknown>,
) {
  return async (
    request: NextRequest,
    context: { params: Promise<unknown> },
  ): Promise<Response> => {
    try {
      const ip = clientIp(request.headers);
      const limit = await hitRateLimit("api", ip);
      if (!limit.allowed) {
        throw new ApiError("RATE_LIMITED", {
          retryAfterSeconds: limit.retryAfterSeconds,
        });
      }
      if (MUTATING_METHODS.has(request.method) && !isSameOrigin(request)) {
        throw new ApiError("FORBIDDEN");
      }

      const input = {
        request,
        ip,
        params:
          schemas.params &&
          parse(schemas.params, await context.params, "NOT_FOUND"),
        query:
          schemas.query &&
          parse(
            schemas.query,
            Object.fromEntries(request.nextUrl.searchParams),
            "VALIDATION_ERROR",
          ),
        body:
          schemas.body &&
          parse(schemas.body, await readJson(request), "VALIDATION_ERROR"),
      } as ApiInput<S>;

      const result = await run(input);
      return result instanceof Response ? result : Response.json(result);
    } catch (error) {
      unstable_rethrow(error);
      if (error instanceof ApiError) return errorResponse(error);
      console.error(`${request.method} ${request.nextUrl.pathname}`, error);
      return errorResponse(new ApiError("INTERNAL_ERROR"));
    }
  };
}

// CSRF protection (spec, section 7). Browsers put the page's origin on every
// POST, PUT, PATCH and DELETE, and a page of another site cannot fake it.
// It is compared with Host, as Next.js does for Server Actions, so the check
// also holds when the dev server is opened by IP from a phone.
function isSameOrigin(request: NextRequest): boolean {
  const origin = request.headers.get("origin");
  const host = request.headers.get("host");
  if (!origin || !host) return false;
  try {
    return new URL(origin).host === host;
  } catch {
    // "null" from sandboxed frames and privacy-sensitive redirects.
    return false;
  }
}

async function readJson(request: NextRequest): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    throw new ApiError("VALIDATION_ERROR");
  }
}

function parse<T>(schema: z.ZodType<T>, value: unknown, code: ErrorCode): T {
  const result = schema.safeParse(value);
  if (result.success) return result.data;
  if (code !== "VALIDATION_ERROR") throw new ApiError(code);

  // The first problem of every field; a form shows it under the field.
  const fields: FieldErrors = {};
  for (const issue of result.error.issues) {
    const path = issue.path.join(".");
    if (path) fields[path] ??= issue.message;
  }
  throw new ApiError(code, Object.keys(fields).length > 0 ? { fields } : {});
}
