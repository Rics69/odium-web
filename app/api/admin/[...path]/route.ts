import { ApiError, apiRoute } from "@/lib/server/http";
import { requireAdmin } from "@/lib/server/session";

// Any /api/admin address without its own route. The rights come first, so
// a player gets 403 whether the address exists or not and learns nothing
// about the admin API; only an admin is told there is nothing here.
const nothingHere = apiRoute({}, async ({ request }) => {
  await requireAdmin(request.headers);
  throw new ApiError("NOT_FOUND");
});

export const GET = nothingHere;
export const POST = nothingHere;
export const PUT = nothingHere;
export const PATCH = nothingHere;
export const DELETE = nothingHere;
