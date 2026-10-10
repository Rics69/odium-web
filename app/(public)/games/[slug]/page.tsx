import type { Metadata, Route } from "next";
import { headers } from "next/headers";
import Image from "next/image";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { ViewTransition, type ReactNode } from "react";
import { BoardProvider } from "@/components/board/board-context";
import { WishCard } from "@/components/board/wish-card";
import { Doodle } from "@/components/doodles/doodle";
import { GameJsonLd } from "@/components/game/game-json-ld";
import { Screenshots } from "@/components/game/screenshots";
import { StoreLinks } from "@/components/game/store-links";
import { TrailerPlayer } from "@/components/game/trailer-player";
import { Reveal } from "@/components/motion/reveal";
import { Badge } from "@/components/ui/badge";
import { BracketLabel } from "@/components/ui/bracket-label";
import { LinkButton } from "@/components/ui/button";
import { Markdown } from "@/components/ui/markdown";
import { TextLink } from "@/components/ui/text-link";
import { env } from "@/lib/env";
import {
  coverTransitionName,
  platformLabel,
  platformsOf,
  statusLabel,
} from "@/lib/games";
import { formatDate, t, tp } from "@/lib/i18n";
import { findBoardGame, topWishes } from "@/lib/server/board";
import { getPublishedGame } from "@/lib/server/games";
import { getCurrentUser } from "@/lib/server/session";
import { parseTrailer } from "@/lib/trailer";

async function loadGame(params: PageProps<"/games/[slug]">["params"]) {
  await connection();
  return getPublishedGame((await params).slug);
}

export async function generateMetadata({
  params,
}: PageProps<"/games/[slug]">): Promise<Metadata> {
  const game = await loadGame(params);
  if (!game) return {};
  const description = game.tagline || undefined;
  return {
    title: game.title,
    description,
    alternates: { canonical: `/games/${game.slug}` },
    openGraph: { title: game.title, description, type: "website" },
  };
}

export default async function GamePage({ params }: PageProps<"/games/[slug]">) {
  const game = await loadGame(params);
  if (!game) notFound();
  const [viewer, boardGame] = await Promise.all([
    getCurrentUser(await headers()),
    findBoardGame(game.slug),
  ]);
  const top = boardGame
    ? await topWishes(boardGame.id, viewer?.id ?? null)
    : [];

  const trailer = game.trailerUrl ? parseTrailer(game.trailerUrl) : null;
  const platforms = platformsOf(game.platforms);
  // LinkButton wraps Link, so the typed route is spelled out here.
  const wishesHref = `/games/${game.slug}/wishes` as Route;

  return (
    <article className="flex flex-col gap-24 pb-8">
      <GameJsonLd game={game} siteUrl={env.SITE_URL} />

      <header className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-4 pt-12 md:px-8 md:pt-16">
        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center gap-4">
            {game.genre && (
              <BracketLabel className="text-ink-2">{game.genre}</BracketLabel>
            )}
            <Badge tone={game.status === "released" ? "neutral" : "accent"}>
              {statusLabel(game.status)}
            </Badge>
          </div>
          <h1 className="font-display text-display-sm">{game.title}</h1>
          {game.tagline && (
            <p className="max-w-2xl text-lg text-ink-2">{game.tagline}</p>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-x-10 gap-y-6">
          <LinkButton href={wishesHref} doodle>
            {t("game.wishCta")}
          </LinkButton>
          <StoreLinks links={game.platforms} />
        </div>
      </header>

      {game.coverUrl && (
        <div className="mx-auto w-full max-w-6xl px-4 md:px-8">
          <ViewTransition
            name={coverTransitionName(game.slug)}
            share="game-cover"
            default="none"
          >
            <div className="relative aspect-[16/9] overflow-hidden rounded-lg bg-line shadow-md">
              <Image
                src={game.coverUrl}
                alt={t("game.coverAlt", { game: game.title })}
                fill
                preload
                sizes="(min-width: 1152px) 1152px, 100vw"
                className="object-cover"
              />
            </div>
          </ViewTransition>
        </div>
      )}

      <section className="mx-auto grid w-full max-w-6xl gap-12 px-4 md:px-8 lg:grid-cols-[2fr_1fr]">
        <div className="flex flex-col gap-6">
          <BracketLabel className="text-ink-2">
            {t("game.aboutLabel")}
          </BracketLabel>
          {game.descriptionMd && (
            <Markdown className="max-w-2xl text-lg">
              {game.descriptionMd}
            </Markdown>
          )}
        </div>
        <dl className="flex flex-col gap-6 self-start rounded-lg border border-line bg-surface p-6">
          <Fact label={t("game.status")}>{statusLabel(game.status)}</Fact>
          {game.releaseDate && (
            <Fact label={t("game.releaseDate")}>
              {formatDate(game.releaseDate)}
            </Fact>
          )}
          {game.genre && <Fact label={t("game.genre")}>{game.genre}</Fact>}
          {platforms.length > 0 && (
            <Fact label={t("game.platforms")}>
              {platforms.map(platformLabel).join(", ")}
            </Fact>
          )}
        </dl>
      </section>

      {game.screenshots.length > 0 && (
        <section className="mx-auto w-full max-w-6xl px-4 md:px-8">
          <h2 className="mb-6 font-display text-h2">{t("game.screenshots")}</h2>
          <Screenshots screenshots={game.screenshots} game={game.title} />
        </section>
      )}

      {trailer && (
        <section className="mx-auto w-full max-w-6xl px-4 md:px-8">
          <h2 className="mb-8 font-display text-h2">{t("game.trailer")}</h2>
          <Reveal>
            <TrailerPlayer
              trailer={trailer}
              poster={game.coverUrl}
              game={game.title}
            />
          </Reveal>
        </section>
      )}

      <section
        aria-labelledby="wishes-title"
        className="mx-auto w-full max-w-6xl px-4 md:px-8"
      >
        <div className="relative flex flex-col gap-8 overflow-hidden rounded-lg bg-accent/10 p-6 md:p-12">
          <Doodle
            name="bubble"
            draw="view"
            className="pointer-events-none absolute -right-6 -bottom-8 size-40 text-accent/30"
          />
          <div className="relative flex flex-col items-start gap-8 md:flex-row md:items-end md:justify-between">
            <div className="flex max-w-xl flex-col gap-4">
              <BracketLabel className="text-accent-deep">
                {t("game.wishesTitle")}
              </BracketLabel>
              <h2 id="wishes-title" className="font-display text-h3">
                {top.length > 0 ? t("game.wishesTop") : t("game.wishesEmpty")}
              </h2>
            </div>
            <LinkButton href={wishesHref} variant="secondary">
              {t("game.wishCta")}
            </LinkButton>
          </div>
          {top.length > 0 && (
            <BoardProvider
              viewer={{
                signedIn: viewer !== null,
                verified: viewer?.emailVerified ?? false,
              }}
            >
              <ol className="relative flex flex-col gap-4">
                {top.map((wish, index) => (
                  <li key={wish.id}>
                    <Reveal delay={index * 0.08}>
                      <WishCard wish={wish} slug={game.slug} />
                    </Reveal>
                  </li>
                ))}
              </ol>
              <TextLink href={wishesHref} className="relative w-fit">
                {t("game.allWishes")} · {tp("games.wishes", game.wishesCount)}
              </TextLink>
            </BoardProvider>
          )}
        </div>
      </section>
    </article>
  );
}

function Fact({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <dt className="text-sm text-ink-2">{label}</dt>
      <dd className="font-medium">{children}</dd>
    </div>
  );
}
