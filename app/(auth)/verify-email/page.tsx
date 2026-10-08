import type { Metadata } from "next";
import { headers } from "next/headers";
import { AuthFrame } from "@/components/account/auth-frame";
import {
  CheckYourMail,
  EmailVerified,
  VerificationFailed,
} from "@/components/account/verify-email-result";
import { t } from "@/lib/i18n";
import { safeNextPath } from "@/lib/next-path";
import { getCurrentUser } from "@/lib/server/session";

export const metadata: Metadata = { title: t("account.verify.title") };

// "Check your mail" after sign-up, and the landing of the link in the
// letter: it goes through /api/auth/verify-email and comes here, with
// ?error= when it is expired or broken. A used link comes without one, and
// the address is confirmed by then anyway.
export default async function VerifyEmailPage({
  searchParams,
}: PageProps<"/verify-email">) {
  const { error, next } = await searchParams;
  const nextPath = safeNextPath(typeof next === "string" ? next : undefined);
  const user = await getCurrentUser(await headers());

  if (error) {
    return (
      <AuthFrame title={t("account.verify.failedTitle")}>
        <VerificationFailed
          reason={error === "TOKEN_EXPIRED" ? "expired" : "invalid"}
          email={user?.email ?? null}
          next={nextPath}
        />
      </AuthFrame>
    );
  }
  // Signed up a moment ago, or came back before confirming.
  if (user && !user.emailVerified) {
    return (
      <AuthFrame title={t("account.register.doneTitle")}>
        <CheckYourMail email={user.email} next={nextPath} />
      </AuthFrame>
    );
  }
  return (
    <AuthFrame title={t("account.verify.doneTitle")}>
      <EmailVerified next={nextPath} signedIn={user !== null} />
    </AuthFrame>
  );
}
