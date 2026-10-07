import type { ReactNode } from "react";
import { BracketLabel } from "@/components/ui/bracket-label";
import { Markdown } from "@/components/ui/markdown";
import { platformsOf, type Platform } from "@/lib/games";
import { t, tp, type MessageKey } from "@/lib/i18n";
import type { PlatformLink } from "@/lib/validation/games";
import { CountUp } from "./count-up";

const platformText = {
  android: "platforms.android",
  ios: "platforms.ios",
  pc: "platforms.pc",
  browser: "platforms.browser",
} as const satisfies Record<Platform, MessageKey>;

type AboutProps = {
  about: string;
  games: { genre: string; platforms: PlatformLink[] }[];
  teamSize: number;
};

// One or two sentences about the studio and the numbers next to them.
export function About({ about, games, teamSize }: AboutProps) {
  const platforms = platformsOf(games.flatMap((game) => game.platforms));
  const genres = [...new Set(games.map((game) => game.genre).filter(Boolean))];

  return (
    <section className="mx-auto max-w-6xl px-4 py-24 md:px-8">
      <BracketLabel className="text-ink-2">{t("home.aboutLabel")}</BracketLabel>
      <div className="mt-8 grid gap-12 lg:grid-cols-[1.3fr_1fr] lg:items-start">
        {about && <Markdown className="font-display text-h2">{about}</Markdown>}
        <div className="grid grid-cols-2 gap-4">
          <Tile>
            <CountUp
              value={games.length}
              className="font-display text-display-sm text-accent"
            />
            <p className="text-ink-2">{tp("home.statGames", games.length)}</p>
          </Tile>
          {teamSize > 0 && (
            <Tile>
              <CountUp
                value={teamSize}
                className="font-display text-display-sm text-accent"
              />
              <p className="text-ink-2">{tp("home.statTeam", teamSize)}</p>
            </Tile>
          )}
          {platforms.length > 0 && (
            <Tile wide>
              <p className="text-sm text-ink-2">{t("home.statPlatforms")}</p>
              <Labels
                items={platforms.map((platform) => t(platformText[platform]))}
              />
            </Tile>
          )}
          {genres.length > 0 && (
            <Tile wide>
              <p className="text-sm text-ink-2">{t("home.statGenres")}</p>
              <Labels items={genres} />
            </Tile>
          )}
        </div>
      </div>
    </section>
  );
}

function Tile({
  wide = false,
  children,
}: {
  wide?: boolean;
  children: ReactNode;
}) {
  return (
    <div
      className={
        "flex flex-col gap-2 rounded-lg border border-line bg-surface p-6 transition-[rotate,translate,box-shadow,border-color] duration-300 ease-[var(--ease-bounce)] hover:-translate-y-1 hover:-rotate-1 hover:border-transparent hover:shadow-md " +
        (wide ? "col-span-2" : "")
      }
    >
      {children}
    </div>
  );
}

function Labels({ items }: { items: string[] }) {
  return (
    <ul className="flex flex-wrap gap-x-4 gap-y-1">
      {items.map((item) => (
        <li key={item}>
          <BracketLabel>{item}</BracketLabel>
        </li>
      ))}
    </ul>
  );
}
