"use client";

import { motion, useReducedMotionConfig, useSpring } from "motion/react";
import Image from "next/image";
import Link from "next/link";
import { ViewTransition, type PointerEvent } from "react";
import { Doodle } from "@/components/doodles/doodle";
import { spring } from "@/components/motion/presets";
import { Badge } from "@/components/ui/badge";
import { BracketLabel } from "@/components/ui/bracket-label";
import {
  coverTransitionName,
  platformLabel,
  platformsOf,
  statusLabel,
} from "@/lib/games";
import { t, tp } from "@/lib/i18n";
import type { GameStatus, PlatformLink } from "@/lib/validation/games";

export type GameCardData = {
  slug: string;
  title: string;
  tagline: string;
  genre: string;
  status: GameStatus;
  coverUrl: string | null;
  platforms: PlatformLink[];
  wishesCount: number;
};

// Degrees the card turns at its edge.
const TILT = 7;
const tiltSpring = { stiffness: 260, damping: 22 };

// A catalogue card that tilts towards the mouse like a card in the hand,
// and gives under a finger on phones.
export function GameCard({ game }: { game: GameCardData }) {
  const reduceMotion = useReducedMotionConfig();
  const rotateX = useSpring(0, tiltSpring);
  const rotateY = useSpring(0, tiltSpring);
  const platforms = platformsOf(game.platforms);

  function tilt(event: PointerEvent<HTMLAnchorElement>) {
    if (reduceMotion || event.pointerType !== "mouse") return;
    const box = event.currentTarget.getBoundingClientRect();
    rotateY.set(((event.clientX - box.left) / box.width - 0.5) * TILT * 2);
    rotateX.set(-((event.clientY - box.top) / box.height - 0.5) * TILT * 2);
  }

  function rest() {
    rotateX.set(0);
    rotateY.set(0);
  }

  return (
    <motion.div
      className="h-full"
      style={{ rotateX, rotateY, transformPerspective: 900 }}
      whileTap={{ scale: 0.98 }}
      transition={spring.snappy}
    >
      <Link
        href={`/games/${game.slug}`}
        onPointerMove={tilt}
        onPointerLeave={rest}
        className="group flex h-full flex-col overflow-hidden rounded-lg border border-line bg-surface transition-[box-shadow,border-color] duration-300 hover:border-transparent hover:shadow-md"
      >
        <ViewTransition
          name={coverTransitionName(game.slug)}
          share="game-cover"
          default="none"
        >
          <div className="relative aspect-[16/10] overflow-hidden bg-line">
            {game.coverUrl ? (
              <Image
                src={game.coverUrl}
                alt=""
                fill
                sizes="(min-width: 1024px) 33vw, (min-width: 768px) 50vw, 100vw"
                className="object-cover transition-[scale] duration-700 ease-out group-hover:scale-105"
              />
            ) : (
              <div className="grid size-full place-items-center text-ink-3">
                <Doodle name="sparkle" className="size-12" />
              </div>
            )}
            <Badge className="absolute top-4 left-4">
              {statusLabel(game.status)}
            </Badge>
          </div>
        </ViewTransition>

        <div className="flex flex-1 flex-col gap-3 p-6">
          {game.genre && (
            <BracketLabel className="text-ink-2">{game.genre}</BracketLabel>
          )}
          <h2 className="font-display text-h3 transition-colors group-hover:text-accent">
            {game.title}
          </h2>
          {game.tagline && (
            <p className="line-clamp-2 text-ink-2">{game.tagline}</p>
          )}

          <div className="mt-auto flex flex-wrap items-center justify-between gap-x-4 gap-y-2 pt-4 text-sm text-ink-2">
            {platforms.length > 0 && (
              <ul
                aria-label={t("home.statPlatforms")}
                className="flex flex-wrap gap-x-3"
              >
                {platforms.map((platform) => (
                  <li key={platform}>{platformLabel(platform)}</li>
                ))}
              </ul>
            )}
            <p className="flex items-center gap-2">
              <Doodle
                name="bubble"
                className="size-5 text-accent transition-[rotate] duration-300 group-hover:-rotate-12"
              />
              {game.wishesCount > 0
                ? tp("games.wishes", game.wishesCount)
                : t("games.noWishes")}
            </p>
          </div>
        </div>
      </Link>
    </motion.div>
  );
}
