"use client";

import {
  motion,
  useMotionValue,
  useReducedMotionConfig,
  useSpring,
  useTransform,
  type MotionValue,
} from "motion/react";
import Image from "next/image";
import type { PointerEvent } from "react";
import { Doodle } from "@/components/doodles/doodle";
import { spring } from "@/components/motion/presets";
import { buttonClasses } from "@/components/ui/button";
import { cn } from "@/lib/cn";
import { t } from "@/lib/i18n";

export type HeroCover = { slug: string; coverUrl: string };

// Where the covers sit over the word (share of its box), their tilt, and how
// strongly they follow the mouse.
const SLOTS = [
  { left: "3%", top: "48%", rotate: -8, depth: 1.4 },
  { left: "55%", top: "-12%", rotate: 6, depth: 0.8 },
  { left: "77%", top: "50%", rotate: -4, depth: 1.1 },
] as const;

// The giant ODIUM with game covers dropped over it, like the bats over the
// type in the moodboard. The word is plain text, visible before JavaScript.
export function Hero({
  tagline,
  covers,
}: {
  tagline: string;
  covers: HeroCover[];
}) {
  const reduceMotion = useReducedMotionConfig();
  const pointerX = useMotionValue(0);
  const pointerY = useMotionValue(0);
  const smoothX = useSpring(pointerX, { stiffness: 120, damping: 20 });
  const smoothY = useSpring(pointerY, { stiffness: 120, damping: 20 });

  function follow(event: PointerEvent<HTMLElement>) {
    if (reduceMotion || event.pointerType !== "mouse") return;
    const box = event.currentTarget.getBoundingClientRect();
    pointerX.set((event.clientX - box.left) / box.width - 0.5);
    pointerY.set((event.clientY - box.top) / box.height - 0.5);
  }

  function rest() {
    pointerX.set(0);
    pointerY.set(0);
  }

  return (
    <section
      onPointerMove={follow}
      onPointerLeave={rest}
      className="relative overflow-x-clip px-4 pt-8 pb-16 md:px-8 md:pt-12"
    >
      <div className="relative mx-auto max-w-[120rem]">
        <h1 className="text-center font-display text-[21vw] leading-[0.85] tracking-[-0.03em]">
          ODIUM
        </h1>
        {covers.slice(0, SLOTS.length).map((cover, index) => (
          <FloatingCover
            key={cover.slug}
            cover={cover}
            slot={SLOTS[index]!}
            index={index}
            pointerX={smoothX}
            pointerY={smoothY}
          />
        ))}
      </div>

      <div className="mx-auto mt-12 flex max-w-6xl flex-col items-start gap-12 md:mt-20 md:flex-row md:items-end md:justify-between">
        {tagline && <p className="max-w-2xl font-display text-h1">{tagline}</p>}
        <a
          href="#games"
          className={cn(buttonClasses("primary"), "group shrink-0")}
        >
          <span
            aria-hidden
            className="pointer-events-none absolute -inset-x-5 -inset-y-3.5 text-ink/70 transition-[rotate] duration-300 group-hover:-rotate-2"
          >
            <Doodle name="outline" draw="view" className="size-full" />
          </span>
          {t("home.gamesCta")}
          <svg
            viewBox="0 0 20 20"
            aria-hidden
            className="size-5 transition-[translate] duration-200 group-hover:translate-y-0.5"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M10 3v13M4 10l6 6 6-6" />
          </svg>
        </a>
      </div>
    </section>
  );
}

function FloatingCover({
  cover,
  slot,
  index,
  pointerX,
  pointerY,
}: {
  cover: HeroCover;
  slot: (typeof SLOTS)[number];
  index: number;
  pointerX: MotionValue<number>;
  pointerY: MotionValue<number>;
}) {
  const x = useTransform(pointerX, (value) => value * slot.depth * 40);
  const y = useTransform(pointerY, (value) => value * slot.depth * 28);

  return (
    <motion.div
      aria-hidden
      className="absolute z-10 w-[26vw] max-w-96 md:w-[19vw]"
      style={{ left: slot.left, top: slot.top, x, y }}
    >
      <motion.div
        className="overflow-hidden rounded-md bg-line shadow-md"
        initial={{ opacity: 0, y: -50, rotate: slot.rotate - 12 }}
        animate={{ opacity: 1, y: 0, rotate: slot.rotate }}
        whileHover={{ rotate: 0, scale: 1.06, transition: spring.snappy }}
        transition={{ ...spring.bouncy, delay: 0.5 + index * 0.15 }}
      >
        <Image
          src={cover.coverUrl}
          alt=""
          width={1600}
          height={900}
          sizes="(min-width: 768px) 19vw, 26vw"
          loading="eager"
          className="aspect-[16/10] h-auto w-full object-cover"
        />
      </motion.div>
    </motion.div>
  );
}
