"use client";

import { AnimatePresence, motion } from "motion/react";
import Image from "next/image";
import { Dialog as RadixDialog } from "radix-ui";
import { useState, type CSSProperties, type KeyboardEvent } from "react";
import { Reveal } from "@/components/motion/reveal";
import { spring } from "@/components/motion/presets";
import { t } from "@/lib/i18n";
import type { Screenshot } from "@/lib/validation/games";

// Screenshots tossed on the table like printed photos; a tap opens them
// full screen (arrows, swipe, Esc).
const TILTS = ["-3deg", "2deg", "-1.5deg", "3deg"];
const SHIFTS = ["0rem", "2.5rem", "1rem", "3rem"];

export function Screenshots({
  screenshots,
  game,
}: {
  screenshots: Screenshot[];
  game: string;
}) {
  const [open, setOpen] = useState<number | null>(null);
  const total = screenshots.length;

  return (
    <>
      <ul className="-mx-4 flex snap-x snap-mandatory gap-6 overflow-x-auto px-4 pt-4 pb-16 md:mx-0 md:flex-wrap md:justify-center md:gap-10 md:overflow-visible md:px-0">
        {screenshots.map((shot, index) => (
          <li
            key={shot.url}
            className="shrink-0 snap-center"
            style={
              {
                "--tilt": TILTS[index % TILTS.length],
                "--shift": SHIFTS[index % SHIFTS.length],
              } as CSSProperties
            }
          >
            <Reveal delay={index * 0.08}>
              <button
                type="button"
                onClick={() => setOpen(index)}
                aria-label={t("gallery.open", { number: index + 1, total })}
                className="block w-44 translate-y-[var(--shift)] rotate-[var(--tilt)] overflow-hidden rounded-md shadow-md transition-[rotate,scale] duration-300 ease-[var(--ease-bounce)] hover:scale-105 hover:rotate-0 md:w-52"
              >
                <Image
                  src={shot.url}
                  alt={shot.alt}
                  width={shot.width}
                  height={shot.height}
                  sizes="208px"
                  className="h-auto w-full"
                />
              </button>
            </Reveal>
          </li>
        ))}
      </ul>
      <Lightbox
        screenshots={screenshots}
        index={open}
        onIndexChange={setOpen}
        title={t("gallery.title", { game })}
      />
    </>
  );
}

const SWIPE_PX = 80;

const slide = {
  enter: (direction: number) => ({ x: direction * 160, opacity: 0 }),
  center: { x: 0, opacity: 1 },
  exit: (direction: number) => ({ x: direction * -160, opacity: 0 }),
};

function Lightbox({
  screenshots,
  index,
  onIndexChange,
  title,
}: {
  screenshots: Screenshot[];
  index: number | null;
  onIndexChange: (index: number | null) => void;
  title: string;
}) {
  const [direction, setDirection] = useState(1);
  const total = screenshots.length;
  const shot = index === null ? null : screenshots[index];

  function go(step: number) {
    if (index === null || total < 2) return;
    setDirection(step);
    onIndexChange((index + step + total) % total);
  }

  function onKeyDown(event: KeyboardEvent) {
    if (event.key === "ArrowRight") go(1);
    if (event.key === "ArrowLeft") go(-1);
  }

  const control =
    "grid size-11 place-items-center rounded-full bg-paper/10 text-paper transition-colors hover:bg-paper/20";

  return (
    <RadixDialog.Root
      open={shot !== null}
      onOpenChange={(open) => !open && onIndexChange(null)}
    >
      <RadixDialog.Portal>
        <RadixDialog.Overlay className="fixed inset-0 z-50 bg-ink/90 data-[state=closed]:animate-overlay-out data-[state=open]:animate-overlay-in" />
        <RadixDialog.Content
          onKeyDown={onKeyDown}
          className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-6 p-4 outline-none data-[state=closed]:animate-overlay-out data-[state=open]:animate-overlay-in"
        >
          <RadixDialog.Title className="sr-only">{title}</RadixDialog.Title>
          <RadixDialog.Description className="sr-only">
            {shot?.alt}
          </RadixDialog.Description>

          <div className="relative flex h-[78dvh] w-full max-w-5xl items-center justify-center overflow-hidden">
            <AnimatePresence
              initial={false}
              custom={direction}
              mode="popLayout"
            >
              {shot && (
                <motion.div
                  key={shot.url}
                  custom={direction}
                  variants={slide}
                  initial="enter"
                  animate="center"
                  exit="exit"
                  transition={spring.snappy}
                  drag={total > 1 ? "x" : false}
                  dragConstraints={{ left: 0, right: 0 }}
                  dragElastic={0.7}
                  onDragEnd={(_, info) => {
                    if (info.offset.x < -SWIPE_PX) go(1);
                    else if (info.offset.x > SWIPE_PX) go(-1);
                  }}
                  className="flex h-full cursor-grab items-center active:cursor-grabbing"
                >
                  <Image
                    src={shot.url}
                    alt={shot.alt}
                    width={shot.width}
                    height={shot.height}
                    sizes="(min-width: 768px) 50vw, 90vw"
                    draggable={false}
                    className="h-full max-h-[78dvh] w-auto rounded-md object-contain select-none"
                  />
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {total > 1 && index !== null && (
            <div className="flex items-center gap-6 text-paper">
              <button
                type="button"
                onClick={() => go(-1)}
                aria-label={t("gallery.previous")}
                className={control}
              >
                <svg
                  viewBox="0 0 20 20"
                  aria-hidden
                  className="size-5"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M12 4l-6 6 6 6" />
                </svg>
              </button>
              <p
                aria-live="polite"
                className="min-w-16 text-center text-sm tabular-nums"
              >
                {t("gallery.counter", { current: index + 1, total })}
              </p>
              <button
                type="button"
                onClick={() => go(1)}
                aria-label={t("gallery.next")}
                className={control}
              >
                <svg
                  viewBox="0 0 20 20"
                  aria-hidden
                  className="size-5"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M8 4l6 6-6 6" />
                </svg>
              </button>
            </div>
          )}

          <RadixDialog.Close
            aria-label={t("common.close")}
            className={`absolute top-4 right-4 ${control}`}
          >
            <svg
              viewBox="0 0 24 24"
              aria-hidden
              className="size-5"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              strokeLinecap="round"
            >
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </RadixDialog.Close>
        </RadixDialog.Content>
      </RadixDialog.Portal>
    </RadixDialog.Root>
  );
}
