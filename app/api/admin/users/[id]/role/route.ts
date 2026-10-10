import { z } from "zod";
import { setRole } from "@/lib/server/admin-users";
import { apiRoute } from "@/lib/server/http";
import { adminOnly } from "@/lib/server/session";
import { roleSchema } from "@/lib/validation/admin-users";

const params = z.object({ id: z.uuid() });

/** { role: "admin" | "user" }: not one's own. */
export const PATCH = apiRoute(
  { guard: adminOnly, params, body: roleSchema },
  async ({ user, params, body }) => {
    await setRole(user, params.id, body.role);
    return { role: body.role };
  },
);
