import { z } from "zod";
import { findOriginals } from "@/lib/server/admin-wishes";
import { apiRoute } from "@/lib/server/http";
import { adminOnly } from "@/lib/server/session";

const params = z.object({ id: z.uuid() });
const query = z.object({ q: z.string().trim().max(100).optional() });

/** Wishes this one could be merged into: { wishes }. */
export const GET = apiRoute(
  { guard: adminOnly, params, query },
  async ({ params, query }) => ({
    wishes: await findOriginals(params.id, query.q || undefined),
  }),
);
