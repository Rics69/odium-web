import type { Metadata } from "next";
import { AuthFrame } from "@/components/account/auth-frame";
import { ForgotPasswordForm } from "@/components/account/password-reset-forms";
import { TextLink } from "@/components/ui/text-link";
import { t } from "@/lib/i18n";

export const metadata: Metadata = { title: t("account.forgot.title") };

export default function ForgotPasswordPage() {
  return (
    <AuthFrame
      title={t("account.forgot.title")}
      lead={t("account.forgot.lead")}
      footer={<TextLink href="/login">{t("account.forgot.back")}</TextLink>}
    >
      <ForgotPasswordForm />
    </AuthFrame>
  );
}
