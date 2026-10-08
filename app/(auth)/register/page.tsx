import type { Metadata, Route } from "next";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { AuthFrame } from "@/components/account/auth-frame";
import { RegisterForm } from "@/components/account/register-form";
import { TextLink } from "@/components/ui/text-link";
import { t } from "@/lib/i18n";
import { safeNextPath } from "@/lib/next-path";
import { getCurrentUser } from "@/lib/server/session";

export const metadata: Metadata = { title: t("account.register.title") };

export default async function RegisterPage({
  searchParams,
}: PageProps<"/register">) {
  const { next } = await searchParams;
  const nextPath = safeNextPath(typeof next === "string" ? next : undefined);
  if (await getCurrentUser(await headers())) redirect(nextPath as Route);

  return (
    <AuthFrame
      title={t("account.register.title")}
      lead={t("account.register.lead")}
      footer={
        <>
          {t("account.register.haveAccount")}{" "}
          <TextLink
            href={`/login?next=${encodeURIComponent(nextPath)}` as Route}
          >
            {t("account.register.signIn")}
          </TextLink>
        </>
      }
    >
      <RegisterForm next={nextPath} />
    </AuthFrame>
  );
}
