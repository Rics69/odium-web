import { apiRoute } from "@/lib/server/http";
import {
  changeEmail,
  changeNickname,
  changePassword,
  deleteAccount,
} from "@/lib/server/profile";
import { getCurrentUser, requireUser } from "@/lib/server/session";
import {
  deleteAccountSchema,
  profileChangeSchema,
} from "@/lib/validation/account";

function withCookies(data: unknown, cookies: string[]) {
  const response = Response.json(data);
  for (const cookie of cookies) response.headers.append("set-cookie", cookie);
  return response;
}

/** The signed-in player, or { user: null } for a guest. */
export const GET = apiRoute({}, async ({ request }) => ({
  user: await getCurrentUser(request.headers),
}));

/** One change: the nickname, the password or the email. */
export const PATCH = apiRoute(
  { body: profileChangeSchema },
  async ({ body, ip, request }) => {
    const user = await requireUser(request.headers);
    const context = { headers: request.headers, ip };
    switch (body.change) {
      case "nickname":
        await changeNickname(user, body.nickname);
        return { user: { nickname: body.nickname } };
      case "password":
        return withCookies(
          { changed: "password" },
          await changePassword(user, body, context),
        );
      case "email":
        await changeEmail(user, body, context);
        return { sent: true };
    }
  },
);

/** Deletes the account, with the password once more. */
export const DELETE = apiRoute(
  { body: deleteAccountSchema },
  async ({ body, ip, request }) => {
    const user = await requireUser(request.headers);
    const cookies = await deleteAccount(user, body.password, {
      headers: request.headers,
      ip,
    });
    return withCookies({ deleted: true }, cookies);
  },
);
