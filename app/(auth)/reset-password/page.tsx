import type { Metadata } from "next";
import { AuthFrame } from "@/components/account/auth-frame";
import {
  ResetLinkInvalid,
  ResetPasswordForm,
} from "@/components/account/password-reset-forms";
import { t } from "@/lib/i18n";

export const metadata: Metadata = { title: t("account.reset.title") };

// The link in the letter goes through /api/auth/reset-password/:token, which
// checks it and lands here with ?token= or ?error=INVALID_TOKEN. The token
// is spent only when the new password is saved.
export default async function ResetPasswordPage({
  searchParams,
}: PageProps<"/reset-password">) {
  const { token, error } = await searchParams;

  if (error || typeof token !== "string" || !token) {
    return (
      <AuthFrame title={t("account.reset.failedTitle")}>
        <ResetLinkInvalid />
      </AuthFrame>
    );
  }
  return (
    <AuthFrame title={t("account.reset.title")} lead={t("account.reset.lead")}>
      <ResetPasswordForm token={token} />
    </AuthFrame>
  );
}
