import type { Metadata, Route } from "next";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { LinkButton } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { t } from "@/lib/i18n";
import { getPublishedGame } from "@/lib/server/games";

export const metadata: Metadata = { title: t("board.title") };

// Until the wish board arrives in step 3.4.
export default async function WishesPage({
  params,
}: PageProps<"/games/[slug]/wishes">) {
  await connection();
  const game = await getPublishedGame((await params).slug);
  if (!game) notFound();

  return (
    <section className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-16 md:px-8">
      <p className="text-ink-2">{game.title}</p>
      <h1 className="font-display text-display-sm">{t("board.title")}</h1>
      <EmptyState
        title={t("board.soonTitle")}
        text={t("board.soonText")}
        action={
          <LinkButton href={`/games/${game.slug}` as Route} variant="secondary">
            {t("board.back")}
          </LinkButton>
        }
      />
    </section>
  );
}
