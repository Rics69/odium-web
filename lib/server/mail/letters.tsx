import "server-only";
import { env } from "@/lib/env";
import { t } from "@/lib/i18n";
import { Action, Letter, Note, Paragraph } from "./layout";
import { sendMail } from "./send";

// The letters the site sends. Links come from Better Auth (one-time tokens);
// steps 2.4, 2.6 and 2.7 decide when each letter goes out.

type LinkLetter = { nickname: string; url: string };

export function VerifyEmailLetter({ nickname, url }: LinkLetter) {
  return (
    <Letter
      preview={t("emails.verify.preview")}
      label={t("emails.verify.label")}
      title={t("emails.verify.title")}
    >
      <Paragraph>{t("emails.greeting", { nickname })}</Paragraph>
      <Paragraph>{t("emails.verify.text")}</Paragraph>
      <Action href={url}>{t("emails.verify.button")}</Action>
      <Note>{t("emails.verify.expiry")}</Note>
      <Note>{t("emails.verify.ignore")}</Note>
    </Letter>
  );
}

export function ResetPasswordLetter({ nickname, url }: LinkLetter) {
  return (
    <Letter
      preview={t("emails.reset.preview")}
      label={t("emails.reset.label")}
      title={t("emails.reset.title")}
    >
      <Paragraph>{t("emails.greeting", { nickname })}</Paragraph>
      <Paragraph>{t("emails.reset.text")}</Paragraph>
      <Action href={url}>{t("emails.reset.button")}</Action>
      <Note>{t("emails.reset.expiry")}</Note>
      <Note>{t("emails.reset.ignore")}</Note>
    </Letter>
  );
}

/** To the new address: it replaces the old one once confirmed. */
export function ChangeEmailLetter({ nickname, url }: LinkLetter) {
  return (
    <Letter
      preview={t("emails.changeEmail.preview")}
      label={t("emails.changeEmail.label")}
      title={t("emails.changeEmail.title")}
    >
      <Paragraph>{t("emails.greeting", { nickname })}</Paragraph>
      <Paragraph>{t("emails.changeEmail.text")}</Paragraph>
      <Action href={url}>{t("emails.changeEmail.button")}</Action>
      <Note>{t("emails.changeEmail.expiry")}</Note>
      <Note>{t("emails.changeEmail.ignore")}</Note>
    </Letter>
  );
}

/** To the old address: nothing to confirm, a warning in case it was not them. */
export function EmailChangeNoticeLetter({
  nickname,
  newEmail,
}: {
  nickname: string;
  newEmail: string;
}) {
  return (
    <Letter
      preview={t("emails.changeNotice.preview")}
      label={t("emails.changeNotice.label")}
      title={t("emails.changeNotice.title")}
    >
      <Paragraph>{t("emails.greeting", { nickname })}</Paragraph>
      <Paragraph>{t("emails.changeNotice.text", { newEmail })}</Paragraph>
      <Paragraph>{t("emails.changeNotice.notYou")}</Paragraph>
      <Action href={new URL("/forgot-password", env.SITE_URL).href}>
        {t("emails.changeNotice.button")}
      </Action>
    </Letter>
  );
}

export function sendVerificationEmail({
  to,
  ...letter
}: LinkLetter & { to: string }) {
  return sendMail({
    to,
    subject: t("emails.verify.subject"),
    letter: <VerifyEmailLetter {...letter} />,
  });
}

export function sendPasswordResetEmail({
  to,
  ...letter
}: LinkLetter & { to: string }) {
  return sendMail({
    to,
    subject: t("emails.reset.subject"),
    letter: <ResetPasswordLetter {...letter} />,
  });
}

export function sendChangeEmailVerification({
  to,
  ...letter
}: LinkLetter & { to: string }) {
  return sendMail({
    to,
    subject: t("emails.changeEmail.subject"),
    letter: <ChangeEmailLetter {...letter} />,
  });
}

export function sendEmailChangeNotice({
  to,
  ...letter
}: {
  to: string;
  nickname: string;
  newEmail: string;
}) {
  return sendMail({
    to,
    subject: t("emails.changeNotice.subject"),
    letter: <EmailChangeNoticeLetter {...letter} />,
  });
}
