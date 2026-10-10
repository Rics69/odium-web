import { listAdminUsers } from "@/lib/server/admin-users";
import { apiRoute } from "@/lib/server/http";
import { adminOnly } from "@/lib/server/session";
import { adminUsersQuerySchema } from "@/lib/validation/admin-users";

/** Players by nickname or email: { users, nextCursor }. */
export const GET = apiRoute(
  { guard: adminOnly, query: adminUsersQuerySchema },
  async ({ query }) => listAdminUsers(query),
);
