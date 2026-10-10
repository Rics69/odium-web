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
  // Outgoing mail. In development: Mailpit from compose.dev.yml, no login.
  SMTP_HOST: z.string().min(1),
  SMTP_PORT: z.coerce.number().int().positive(),
  SMTP_USER: z.string().optional(),
  SMTP_PASSWORD: z.string().optional(),
  // Sender, with a name: Odium <no-reply@odium.example>
  MAIL_FROM: z.string().min(1),
  // Where uploaded images live on disk (a Docker volume on the server).
  STORAGE_DIR: z.string().min(1).default("storage"),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  throw new Error(
    `Invalid environment variables (see .env.example):\n${z.prettifyError(parsed.error)}`,
  );
}

export const env = parsed.data;
