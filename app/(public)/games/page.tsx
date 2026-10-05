import type { Metadata } from "next";
import { EmptyState } from "@/components/ui/empty-state";
import { t } from "@/lib/i18n";

export const metadata: Metadata = {
  title: t("games.title"),
};

// Until the catalogue arrives in step 1.5.
export default function GamesPage() {
  return (
    <section className="mx-auto flex max-w-6xl flex-col gap-8 px-4 py-16 md:px-8">
      <h1 className="font-display text-h1">{t("games.title")}</h1>
      <EmptyState
        title={t("games.comingSoonTitle")}
        text={t("games.comingSoonText")}
      />
    </section>
  );
}
