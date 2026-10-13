"use client";

import { useReducedMotionConfig } from "framer-motion";
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
// scatter them across the header before they spring back. Hover and clicks
// use the browser's own animations: the logo is on every page, and Motion's
// animation engine would weigh more than the logo needs.
export function Logo({ className }: { className?: string }) {
  const scope = useRef<HTMLAnchorElement>(null);
  const reduceMotion = useReducedMotionConfig();
  const clicks = useRef<number[]>([]);

  const letters = () =>
    scope.current?.querySelectorAll<HTMLElement>("[data-letter]") ?? [];

  function wave() {
    if (reduceMotion) return;
    letters().forEach((letter, index) => {
      letter.animate(
        [
          { transform: "translateY(0)" },
          { transform: "translateY(-5px)" },
          { transform: "translateY(0)" },
        ],
        { duration: 350, delay: index * 50, easing: "ease-in-out" },
      );
    });
  }

  function scatter() {
    letters().forEach((letter) => {
      const away = `translate(${between(-90, 90)}px, ${between(-40, 70)}px) rotate(${between(-200, 200)}deg)`;
      letter.animate(
        [
          { transform: "none", easing: "ease-out" },
          {
            transform: away,
            offset: 0.3,
            easing: "cubic-bezier(0.34, 1.56, 0.64, 1)",
          },
          { transform: "none" },
        ],
        { duration: 1400 },
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
