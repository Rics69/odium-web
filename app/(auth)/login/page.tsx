import type { Metadata, Route } from "next";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { AuthFrame } from "@/components/account/auth-frame";
import { LoginForm } from "@/components/account/login-form";
import { TextLink } from "@/components/ui/text-link";
import { t } from "@/lib/i18n";
import { safeNextPath } from "@/lib/next-path";
import { getCurrentUser } from "@/lib/server/session";

export const metadata: Metadata = { title: t("account.login.title") };

// After signing in the player returns to ?next=, a page of this site only.
export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const { next } = await searchParams;
  const nextPath = safeNextPath(typeof next === "string" ? next : undefined);
  if (await getCurrentUser(await headers())) redirect(nextPath as Route);

  return (
    <AuthFrame
      title={t("account.login.title")}
      lead={t("account.login.lead")}
      footer={
        <>
          {t("account.login.noAccount")}{" "}
          <TextLink
            href={`/register?next=${encodeURIComponent(nextPath)}` as Route}
          >
            {t("account.login.register")}
          </TextLink>
        </>
      }
    >
      <LoginForm next={nextPath} />
    </AuthFrame>
  );
}
