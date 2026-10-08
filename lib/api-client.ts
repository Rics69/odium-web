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

/** POSTs JSON to our API; the answer's data, or an ApiRequestError. */
export async function apiPost<T>(path: string, body: unknown): Promise<T> {
  let response: Response;
  try {
    response = await fetch(path, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
  } catch {
    throw new ApiRequestError("NETWORK_ERROR", t("errors.network"));
  }
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
