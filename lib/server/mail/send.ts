import "server-only";
import { render } from "@react-email/components";
import nodemailer from "nodemailer";
import type { ReactElement } from "react";
import { env } from "@/lib/env";

// SMTP from the environment: Mailpit in development, the mail provider in
// production. Port 465 speaks TLS from the start, others upgrade with
// STARTTLS. Short timeouts: a stuck mail server must not hang a request.
const transport = nodemailer.createTransport({
  host: env.SMTP_HOST,
  port: env.SMTP_PORT,
  secure: env.SMTP_PORT === 465,
  auth: env.SMTP_USER
    ? { user: env.SMTP_USER, pass: env.SMTP_PASSWORD }
    : undefined,
  connectionTimeout: 10_000,
  greetingTimeout: 10_000,
  socketTimeout: 20_000,
});

/** Sends a React Email letter as HTML with a plain-text twin. */
export async function sendMail({
  to,
  subject,
  letter,
}: {
  to: string;
  subject: string;
  letter: ReactElement;
}): Promise<void> {
  const [html, text] = await Promise.all([
    render(letter),
    render(letter, { plainText: true }),
  ]);
  await transport.sendMail({ from: env.MAIL_FROM, to, subject, html, text });
}
