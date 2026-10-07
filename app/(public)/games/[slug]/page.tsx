import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { BracketLabel } from "@/components/ui/bracket-label";
import { EmptyState } from "@/components/ui/empty-state";
import { t } from "@/lib/i18n";
import { getPublishedGame } from "@/lib/server/games";

export async function generateMetadata({
  params,
}: PageProps<"/games/[slug]">): Promise<Metadata> {
  await connection();
  const game = await getPublishedGame((await params).slug);
  return game ? { title: game.title, description: game.tagline } : {};
}

// Until the full game page arrives in step 1.6.
export default async function GamePage({ params }: PageProps<"/games/[slug]">) {
  await connection();
  const game = await getPublishedGame((await params).slug);
  if (!game) notFound();

  return (
    <section className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-16 md:px-8">
      {game.genre && (
        <BracketLabel className="text-ink-2">{game.genre}</BracketLabel>
      )}
      <h1 className="font-display text-display-sm">{game.title}</h1>
      {game.tagline && <p className="text-lg text-ink-2">{game.tagline}</p>}
      <EmptyState
        title={t("game.comingSoonTitle")}
        text={t("game.comingSoonText")}
      />
    </section>
  );
}
