"use client";

import { stagger, useAnimate, useReducedMotionConfig } from "motion/react";
import Link from "next/link";
import { useRef, type CSSProperties } from "react";
import { cn } from "@/lib/cn";
import { t } from "@/lib/i18n";

const LETTERS = ["O", "D", "I", "U", "M"];
const CLICKS_FOR_SURPRISE = 5;
const CLICK_WINDOW_MS = 2000;

const between = (min: number, max: number) => min + Math.random() * (max - min);

// ODIUM in the display font. The letters drop in on load (plain CSS, so the
// logo never waits for JavaScript), wave on hover, and five quick clicks
// scatter them across the header before they spring back.
export function Logo({ className }: { className?: string }) {
  const [scope, animate] = useAnimate<HTMLAnchorElement>();
  const reduceMotion = useReducedMotionConfig();
  const clicks = useRef<number[]>([]);

  function wave() {
    if (reduceMotion) return;
    animate(
      "[data-letter]",
      { y: [0, -5, 0] },
      { duration: 0.35, delay: stagger(0.05) },
    );
  }

  function scatter() {
    scope.current
      .querySelectorAll<HTMLElement>("[data-letter]")
      .forEach((letter) => {
        animate(
          letter,
          {
            x: [0, between(-90, 90), 0],
            y: [0, between(-40, 70), 0],
            rotate: [0, between(-200, 200), 0],
          },
          {
            duration: 1.4,
            times: [0, 0.3, 1],
            ease: ["easeOut", [0.34, 1.56, 0.64, 1]],
          },
        );
      });
  }

  function countClick() {
    const now = Date.now();
    clicks.current = [
      ...clicks.current.filter((time) => now - time < CLICK_WINDOW_MS),
      now,
    ];
    if (clicks.current.length >= CLICKS_FOR_SURPRISE && !reduceMotion) {
      clicks.current = [];
      scatter();
    }
  }

  return (
    <Link
      ref={scope}
      href="/"
      aria-label={t("nav.logo")}
      onMouseEnter={wave}
      onClick={countClick}
      className={cn(
        "inline-flex min-h-11 items-center font-display text-h4 leading-none select-none",
        className,
      )}
    >
      {LETTERS.map((letter, index) => (
        <span
          key={letter}
          data-letter
          aria-hidden
          className="logo-letter inline-block"
          style={{ "--i": index } as CSSProperties}
        >
          {letter}
        </span>
      ))}
    </Link>
  );
}
