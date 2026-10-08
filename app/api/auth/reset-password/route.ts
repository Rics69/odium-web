import { apiRoute } from "@/lib/server/http";
import { resetPassword } from "@/lib/server/password-reset";
import { resetPasswordSchema } from "@/lib/validation/account";

/** A new password by the link from the letter. */
export const POST = apiRoute(
  { body: resetPasswordSchema },
  async ({ body, request }) => {
    await resetPassword(body, request.headers);
    return { reset: true };
  },
);
