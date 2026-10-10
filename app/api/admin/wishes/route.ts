import { listAdminWishes } from "@/lib/server/admin-wishes";
import { apiRoute } from "@/lib/server/http";
import { adminOnly } from "@/lib/server/session";
import { adminWishesQuerySchema } from "@/lib/validation/admin-wishes";

/** The moderation table: { wishes, nextCursor }, hidden ones included. */
export const GET = apiRoute(
  { guard: adminOnly, query: adminWishesQuerySchema },
  async ({ query }) => listAdminWishes(query),
);
