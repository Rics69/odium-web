import { resendVerificationEmail } from "@/lib/server/accounts";
import { apiRoute } from "@/lib/server/http";
import { resendVerificationSchema } from "@/lib/validation/account";

/** The confirmation letter once more (the banner, /verify-email). */
export const POST = apiRoute(
  { body: resendVerificationSchema },
  async ({ body, request }) => {
    await resendVerificationEmail(body, request.headers);
    return { sent: true };
  },
);
