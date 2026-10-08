import { signUp } from "@/lib/server/accounts";
import { apiRoute } from "@/lib/server/http";
import { signUpSchema } from "@/lib/validation/account";

/** Sign-up: the account, a session cookie and a confirmation letter. */
export const POST = apiRoute(
  { body: signUpSchema },
  async ({ body, ip, request }) => {
    const { user, cookies } = await signUp(body, {
      headers: request.headers,
      ip,
    });
    const response = Response.json(
      { user: { nickname: user.name, email: user.email } },
      { status: 201 },
    );
    for (const cookie of cookies) response.headers.append("set-cookie", cookie);
    return response;
  },
);
