import type { Metadata } from "next";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import {
  DeleteAccount,
  EmailForm,
  NicknameForm,
  PasswordForm,
} from "@/components/account/profile-forms";
import { MyWishes } from "@/components/account/my-wishes";
import { SignOutButton } from "@/components/account/sign-out-button";
import { BracketLabel } from "@/components/ui/bracket-label";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/cn";
import { formatDate, t } from "@/lib/i18n";
import { listMyWishes } from "@/lib/server/board";
import { getCurrentUser } from "@/lib/server/session";

export const metadata: Metadata = {
  title: t("account.profile.title"),
  robots: { index: false, follow: false },
};

export default async function ProfilePage() {
  const user = await getCurrentUser(await headers());
  if (!user) redirect("/login?next=%2Fprofile");
  const myWishes = await listMyWishes(user.id);

  return (
    <section className="mx-auto flex max-w-3xl flex-col gap-10 px-4 py-12 md:px-8 md:py-16">
      <div className="flex flex-col gap-3">
        <BracketLabel className="text-ink-2">
          {t("account.profile.title")}
        </BracketLabel>
        <h1 className="font-display text-display-sm break-words">
          {user.nickname}
        </h1>
        <p className="text-ink-2">
          {t("account.profile.memberSince", {
            date: formatDate(user.createdAt.toISOString().slice(0, 10)),
          })}
          {" · "}
          <span className={cn(!user.emailVerified && "text-error")}>
            {t(
              user.emailVerified
                ? "account.profile.emailVerified"
                : "account.profile.emailNotVerified",
            )}
          </span>
        </p>
      </div>

      <Section title={t("account.profile.wishesTitle")}>
        <MyWishes firstPage={myWishes} />
      </Section>
      <Section title={t("account.profile.nicknameTitle")}>
        <NicknameForm nickname={user.nickname} />
      </Section>
      <Section title={t("account.profile.emailTitle")}>
        <EmailForm email={user.email} />
      </Section>
      <Section title={t("account.profile.passwordTitle")}>
        <PasswordForm />
      </Section>
      <Section
        title={t("account.profile.exitTitle")}
        text={t("account.profile.exitText")}
      >
        <SignOutButton />
      </Section>
      <Section
        title={t("account.profile.deleteTitle")}
        text={t("account.profile.deleteText")}
      >
        <DeleteAccount />
      </Section>
    </section>
  );
}

function Section({
  title,
  text,
  children,
}: {
  title: string;
  text?: string;
  children: ReactNode;
}) {
  return (
    <Card className="flex flex-col gap-4 md:p-8">
      <h2 className="font-display text-h3">{title}</h2>
      {text && <p className="text-ink-2">{text}</p>}
      {children}
    </Card>
  );
}
