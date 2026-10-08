import "server-only";
import { isAPIError } from "better-auth/api";
import type { ResetPasswordInput } from "@/lib/validation/account";
import { auth } from "./auth";
import { ApiError } from "./http";
import { hitRateLimit } from "./rate-limit";

// "Forgot password" (spec, section 7). Better Auth keeps the one-time
// tokens; our routes add the limits and the answers.

/**
 * Sends a reset link, if the address is registered. The answer is the same
 * either way, and the letter goes out in the background, so neither the
 * answer nor its timing tells whether the address exists. Three requests an
 * hour per address and, separately, per IP.
 */
export async function requestPasswordReset(
  email: string,
  request: { headers: Headers; ip: string },
): Promise<void> {
  for (const [name, subject] of [
    ["passwordResetPerEmail", email],
    ["passwordResetPerIp", request.ip],
  ] as const) {
    const limit = await hitRateLimit(name, subject);
    if (!limit.allowed) {
      throw new ApiError("RATE_LIMITED", {
        retryAfterSeconds: limit.retryAfterSeconds,
      });
    }
  }
  await auth.api.requestPasswordReset({
    body: { email, redirectTo: "/reset-password" },
    headers: request.headers,
  });
}

/** Sets a new password by a reset link; every session of the player ends. */
export async function resetPassword(
  input: ResetPasswordInput,
  headers: Headers,
): Promise<void> {
  try {
    await auth.api.resetPassword({
      body: { token: input.token, newPassword: input.password },
      headers,
    });
  } catch (error) {
    // Expired, used or made up: one answer, and the way to a new link.
    if (isAPIError(error) && error.body?.code === "INVALID_TOKEN") {
      throw new ApiError("RESET_LINK_INVALID");
    }
    throw error;
  }
}
