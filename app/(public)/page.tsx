import { connection } from "next/server";
import { About } from "@/components/home/about";
import { GamesGallery } from "@/components/home/games-gallery";
import { Hero } from "@/components/home/hero";
import { Marquee } from "@/components/home/marquee";
import { Team } from "@/components/home/team";
import { Doodle } from "@/components/doodles/doodle";
import { BracketLabel } from "@/components/ui/bracket-label";
import { EmptyState } from "@/components/ui/empty-state";
import { t } from "@/lib/i18n";
import { getPublishedGames } from "@/lib/server/games";
import { getStudioInfo } from "@/lib/server/studio";

// Little text, many things to look at: the word, the games, a few numbers,
// the team. The footer below adds the studio's goal.
export default async function HomePage() {
  await connection();
  const [games, studio] = await Promise.all([
    getPublishedGames(),
    getStudioInfo(),
  ]);
  const covers = games.flatMap((game) =>
    game.coverUrl ? [{ slug: game.slug, coverUrl: game.coverUrl }] : [],
  );

  return (
    <>
      <Hero tagline={studio?.tagline ?? ""} covers={covers} />
      <Marquee items={games.map((game) => game.title)} />

      <section
        id="games"
        className="mx-auto max-w-6xl scroll-mt-8 px-4 py-24 md:px-8"
      >
        <div className="mb-16 flex items-end justify-between gap-6">
          <div className="flex flex-col gap-4">
            <BracketLabel className="text-ink-2">
              {t("home.gamesLabel")}
            </BracketLabel>
            <h2 className="font-display text-display-sm">
              {t("home.gamesTitle")}
            </h2>
          </div>
          <Doodle
            name="arrow"
            draw="view"
            className="hidden h-20 w-28 rotate-90 text-accent md:block"
          />
        </div>
        {games.length > 0 ? (
          <GamesGallery games={games} />
        ) : (
          <EmptyState
            title={t("games.noGamesTitle")}
            text={t("games.noGamesText")}
          />
        )}
      </section>

      <About
        about={studio?.aboutMd ?? ""}
        games={games}
        teamSize={studio?.team.length ?? 0}
      />
      <Team team={studio?.team ?? []} />
    </>
  );
}
