import type { Metadata } from "next";
import { LinkButton } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { t } from "@/lib/i18n";

export const metadata: Metadata = { title: t("account.signInTitle") };

// Until sign-up and sign-in arrive in steps 2.4 and 2.5.
export default function LoginPage() {
  return (
    <section className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-16 md:px-8">
      <h1 className="font-display text-display-sm">
        {t("account.signInTitle")}
      </h1>
      <EmptyState
        title={t("account.signInSoonTitle")}
        text={t("account.signInSoonText")}
        action={
          <LinkButton href="/games" variant="secondary">
            {t("account.toGames")}
          </LinkButton>
        }
      />
    </section>
  );
}
