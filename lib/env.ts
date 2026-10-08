import "server-only";
import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),
  // Public address of the site: absolute links in metadata and emails.
  SITE_URL: z.url(),
  DATABASE_URL: z.url({ protocol: /^postgres(ql)?$/ }),
  // Signs session cookies and one-time links: openssl rand -base64 32
  BETTER_AUTH_SECRET: z.string().min(32),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  throw new Error(
    `Invalid environment variables (see .env.example):\n${z.prettifyError(parsed.error)}`,
  );
}

export const env = parsed.data;
