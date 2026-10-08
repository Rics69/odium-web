import { apiRoute } from "@/lib/server/http";
import { requestPasswordReset } from "@/lib/server/password-reset";
import { forgotPasswordSchema } from "@/lib/validation/account";

/** A reset link by email; the same answer for any address. */
export const POST = apiRoute(
  { body: forgotPasswordSchema },
  async ({ body, ip, request }) => {
    await requestPasswordReset(body.email, { headers: request.headers, ip });
    return { sent: true };
  },
);
