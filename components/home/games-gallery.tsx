"use client";

import {
  motion,
  useReducedMotionConfig,
  useScroll,
  useTransform,
} from "motion/react";
import Image from "next/image";
import Link from "next/link";
import { useRef } from "react";
import { Doodle } from "@/components/doodles/doodle";
import { Reveal } from "@/components/motion/reveal";
import { Badge } from "@/components/ui/badge";
import { BracketLabel } from "@/components/ui/bracket-label";
import { cn } from "@/lib/cn";
import { statusLabel } from "@/lib/games";
import type { GameStatus } from "@/lib/validation/games";

export type GalleryGame = {
  slug: string;
  title: string;
  tagline: string;
  genre: string;
  status: GameStatus;
  coverUrl: string | null;
};

// The lookbook from the moodboard: different sizes and shapes, big gaps,
// each picture drifting at its own speed while the page scrolls.
const LAYOUTS = [
  {
    box: "w-[92%] lg:col-span-7 lg:w-auto",
    aspect: "aspect-[16/10]",
    speed: 0.6,
  },
  {
    box: "ml-auto w-[78%] lg:col-span-4 lg:col-start-9 lg:mt-40 lg:ml-0 lg:w-auto",
    aspect: "aspect-[4/5]",
    speed: 1.2,
  },
  {
    box: "w-[84%] lg:col-span-5 lg:col-start-2 lg:-mt-8 lg:w-auto",
    aspect: "aspect-[4/3]",
    speed: 0.9,
  },
  {
    box: "ml-auto w-[88%] lg:col-span-6 lg:col-start-7 lg:mt-24 lg:ml-0 lg:w-auto",
    aspect: "aspect-[16/10]",
    speed: 0.5,
  },
] as const;

export function GamesGallery({ games }: { games: GalleryGame[] }) {
  return (
    <ul className="grid grid-cols-1 gap-16 lg:grid-cols-12 lg:gap-x-8 lg:gap-y-24">
      {games.map((game, index) => (
        <GalleryItem
          key={game.slug}
          game={game}
          layout={LAYOUTS[index % LAYOUTS.length]!}
        />
      ))}
    </ul>
  );
}

function GalleryItem({
  game,
  layout,
}: {
  game: GalleryGame;
  layout: (typeof LAYOUTS)[number];
}) {
  const ref = useRef<HTMLLIElement>(null);
  const reduceMotion = useReducedMotionConfig();
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"],
  });
  const drift = useTransform(
    scrollYProgress,
    [0, 1],
    [layout.speed * 48, layout.speed * -48],
  );

  return (
    <li ref={ref} className={layout.box}>
      <motion.div style={{ y: reduceMotion ? 0 : drift }}>
        <Reveal>
          <Link href={`/games/${game.slug}`} className="group block">
            <div
              className={cn(
                "relative overflow-hidden rounded-lg bg-line",
                layout.aspect,
              )}
            >
              {game.coverUrl ? (
                <Image
                  src={game.coverUrl}
                  alt=""
                  fill
                  sizes="(min-width: 1024px) 50vw, 90vw"
                  className="object-cover transition-[scale] duration-700 ease-out group-hover:scale-105"
                />
              ) : (
                <div className="grid size-full place-items-center text-ink-3">
                  <Doodle name="sparkle" className="size-16" />
                </div>
              )}
              <Badge className="absolute top-4 left-4">
                {statusLabel(game.status)}
              </Badge>
            </div>
            <div className="mt-6 flex items-start justify-between gap-6">
              <div className="flex flex-col gap-2">
                {game.genre && (
                  <BracketLabel className="text-ink-2">
                    {game.genre}
                  </BracketLabel>
                )}
                <h3 className="font-display text-h3 transition-colors group-hover:text-accent">
                  {game.title}
                </h3>
                {game.tagline && <p className="text-ink-2">{game.tagline}</p>}
              </div>
              <Doodle
                name="arrow"
                draw="hover"
                className="h-12 w-16 shrink-0 text-accent"
              />
            </div>
          </Link>
        </Reveal>
      </motion.div>
    </li>
  );
}
