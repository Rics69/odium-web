import { t } from "@/lib/i18n";

/** An error answer of our API, or a failed request (code NETWORK_ERROR). */
export class ApiRequestError extends Error {
  readonly code: string;
  readonly status: number;
  readonly fields: Record<string, string>;

  constructor(
    code: string,
    message: string,
    status = 0,
    fields: Record<string, string> = {},
  ) {
    super(message);
    this.code = code;
    this.status = status;
    this.fields = fields;
  }
}

type ErrorBody = {
  error?: { code?: string; message?: string; fields?: Record<string, string> };
};

/** GETs from our API; the answer's data, or an ApiRequestError. */
export async function apiGet<T>(path: string): Promise<T> {
  let response: Response;
  try {
    response = await fetch(path);
  } catch {
    throw new ApiRequestError("NETWORK_ERROR", t("errors.network"));
  }
  return readAnswer<T>(response);
}

/** POSTs a file as multipart `file`; the answer's data, or an error. */
export async function apiUpload<T>(path: string, file: File): Promise<T> {
  const body = new FormData();
  body.set("file", file);
  let response: Response;
  try {
    response = await fetch(path, { method: "POST", body });
  } catch {
    throw new ApiRequestError("NETWORK_ERROR", t("errors.network"));
  }
  return readAnswer<T>(response);
}

/** POSTs JSON to our API; the answer's data, or an ApiRequestError. */
export function apiPost<T>(path: string, body: unknown): Promise<T> {
  return apiSend<T>("POST", path, body);
}

/** Sends JSON to our API with any changing method. */
export async function apiSend<T>(
  method: "POST" | "PUT" | "PATCH" | "DELETE",
  path: string,
  body: unknown,
): Promise<T> {
  let response: Response;
  try {
    response = await fetch(path, {
      method,
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
  } catch {
    throw new ApiRequestError("NETWORK_ERROR", t("errors.network"));
  }
  return readAnswer<T>(response);
}

async function readAnswer<T>(response: Response): Promise<T> {
  const data: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    const error = (data as ErrorBody | null)?.error;
    throw new ApiRequestError(
      error?.code ?? "INTERNAL_ERROR",
      error?.message ?? t("errors.internal"),
      response.status,
      error?.fields,
    );
  }
  return data as T;
}
