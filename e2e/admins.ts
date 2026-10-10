import { randomBytes } from "node:crypto";
import type { APIRequestContext } from "@playwright/test";
import { drizzle } from "drizzle-orm/node-postgres";
import { Client } from "pg";
import { createAdmin } from "../scripts/admin";
import { testEnv } from "../test/env";

/**
 * A new admin, made the way `npm run create-admin` makes one, and signed in
 * on this request context (the page shares its cookies).
 */
export async function signInAsAdmin(
  request: APIRequestContext,
  origin: string,
) {
  const id = randomBytes(4).toString("hex");
  const email = `e2e-admin-${id}@example.com`;
  const client = new Client({ connectionString: testEnv.DATABASE_URL });
  await client.connect();
  let password: string;
  try {
    const result = await createAdmin(
      drizzle({ client, casing: "snake_case" }),
      {
        email,
        nickname: `Admin_${id}`,
      },
    );
    if (result.status !== "created") throw new Error(result.status);
    password = result.password;
  } finally {
    await client.end();
  }
  const response = await request.post("/api/auth/sign-in", {
    headers: { origin },
    data: { email, password },
  });
  if (!response.ok()) throw new Error(`admin sign-in: ${response.status()}`);
  return { nickname: `Admin_${id}` };
}
