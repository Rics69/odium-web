"use client";

import Image from "next/image";
import { useState } from "react";
import { BracketLabel } from "@/components/ui/bracket-label";
import { t } from "@/lib/i18n";
import type { Trailer } from "@/lib/trailer";

// Only a picture and a play button until pressed: the real player weighs
// more than the rest of the page together (spec: Lighthouse ≥ 90).
export function TrailerPlayer({
  trailer,
  poster,
  game,
}: {
  trailer: Trailer;
  poster: string | null;
  game: string;
}) {
  const [playing, setPlaying] = useState(false);
  const picture = trailer.thumbnailUrl ?? poster;
  const label = t("game.playTrailer", { game });

  return (
    <div className="relative aspect-video overflow-hidden rounded-lg bg-ink">
      {playing ? (
        <iframe
          src={trailer.embedUrl}
          title={label}
          allow="autoplay; encrypted-media; fullscreen; picture-in-picture"
          allowFullScreen
          className="absolute inset-0 size-full"
        />
      ) : (
        <button
          type="button"
          onClick={() => setPlaying(true)}
          aria-label={label}
          className="group absolute inset-0 grid place-items-center"
        >
          {picture && (
            <Image
              src={picture}
              alt=""
              fill
              sizes="(min-width: 1152px) 1152px, 100vw"
              className="object-cover opacity-80 transition-[opacity,scale] duration-700 ease-out group-hover:scale-105 group-hover:opacity-100"
            />
          )}
          <span className="relative grid size-20 place-items-center rounded-full bg-accent text-white shadow-md transition-[scale] duration-300 ease-[var(--ease-bounce)] group-hover:scale-110 md:size-24">
            <svg
              viewBox="0 0 24 24"
              aria-hidden
              className="ml-1 size-8 md:size-10"
              fill="currentColor"
            >
              <path d="M7 4.5v15l12-7.5z" />
            </svg>
          </span>
          <BracketLabel className="absolute bottom-4 left-4 text-paper">
            {t("game.trailer")}
          </BracketLabel>
        </button>
      )}
    </div>
  );
}
