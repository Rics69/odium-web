import { signIn } from "@/lib/server/accounts";
import { apiRoute } from "@/lib/server/http";
import { signInSchema } from "@/lib/validation/account";

/** Sign-in: a session cookie, or one answer for any wrong pair. */
export const POST = apiRoute(
  { body: signInSchema },
  async ({ body, ip, request }) => {
    const { user, cookies } = await signIn(body, {
      headers: request.headers,
      ip,
    });
    const response = Response.json({ user: { nickname: user.name } });
    for (const cookie of cookies) response.headers.append("set-cookie", cookie);
    return response;
  },
);
