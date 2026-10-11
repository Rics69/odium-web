import {
  getBlockedDomains,
  saveBlockedDomains,
} from "@/lib/server/admin-studio";
import { apiRoute } from "@/lib/server/http";
import { adminOnly } from "@/lib/server/session";
import { blockedDomainsSchema } from "@/lib/validation/admin-studio";

/** { domains }, alphabetical. */
export const GET = apiRoute({ guard: adminOnly }, async () => ({
  domains: await getBlockedDomains(),
}));

/** The whole list: { added, removed }. */
export const PUT = apiRoute(
  { guard: adminOnly, body: blockedDomainsSchema },
  async ({ user, body }) => saveBlockedDomains(user, body.domains),
);
