import type { Metadata } from "next";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { EmptyState } from "@/components/ui/empty-state";
import { t } from "@/lib/i18n";
import { getCurrentUser } from "@/lib/server/session";

export const metadata: Metadata = { title: t("account.profileTitle") };

// Until the profile arrives in step 2.7.
export default async function ProfilePage() {
  const user = await getCurrentUser(await headers());
  if (!user) redirect("/login");

  return (
    <section className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-16 md:px-8">
      <p className="text-ink-2">{t("account.profileTitle")}</p>
      <h1 className="font-display text-display-sm break-words">
        {user.nickname}
      </h1>
      <EmptyState
        title={t("account.profileSoonTitle")}
        text={t("account.profileSoonText")}
      />
    </section>
  );
}
