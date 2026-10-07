import type { Metadata } from "next";
import { connection } from "next/server";
import { GameCard } from "@/components/games/game-card";
import { Reveal } from "@/components/motion/reveal";
import { CountUp } from "@/components/ui/count-up";
import { EmptyState } from "@/components/ui/empty-state";
import { t } from "@/lib/i18n";
import { getPublishedGames } from "@/lib/server/games";

export const metadata: Metadata = {
  title: t("games.title"),
  description: t("games.description"),
};

export default async function GamesPage() {
  await connection();
  const games = await getPublishedGames();

  return (
    <section className="mx-auto max-w-6xl px-4 py-16 md:px-8 md:py-24">
      <div className="mb-12 flex flex-col gap-4 md:mb-16">
        <div className="flex items-start gap-3">
          <h1 className="font-display text-display-sm">{t("games.title")}</h1>
          <span aria-hidden className="pt-2 font-display text-h3 text-accent">
            <CountUp value={games.length} />
          </span>
        </div>
        <p className="max-w-xl text-lg text-ink-2">{t("games.description")}</p>
      </div>

      {games.length > 0 ? (
        <ul className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
          {games.map((game, index) => (
            <li key={game.slug}>
              <Reveal delay={(index % 3) * 0.08} className="h-full">
                <GameCard game={game} />
              </Reveal>
            </li>
          ))}
        </ul>
      ) : (
        <EmptyState
          title={t("games.noGamesTitle")}
          text={t("games.noGamesText")}
        />
      )}
    </section>
  );
}
