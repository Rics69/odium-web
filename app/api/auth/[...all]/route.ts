import { auth } from "@/lib/server/auth";
import { apiRoute } from "@/lib/server/http";

// Better Auth: sign-up, sign-in, sign-out, sessions. Wrapped like every API
// route, so the per-IP limit and the Origin check hold here too.
const handler = apiRoute({}, ({ request }) => auth.handler(request));

export const GET = handler;
export const POST = handler;
