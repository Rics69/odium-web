"use client";

import { motion, useInView } from "motion/react";
import { useId, useRef, type CSSProperties } from "react";
import { useDoodleDrawing } from "@/components/doodles/doodle";
import { ease } from "@/components/motion/presets";
import { BracketLabel } from "@/components/ui/bracket-label";

// A hand-drawn piggy bank. When it scrolls into view the outline draws
// itself, three coins drop into the slot and the pig fills up with colour.
const BODY =
  "M44 42 C 62 24, 112 22, 132 42 C 146 56, 146 80, 130 92 C 112 106, 62 106, 44 94 C 26 82, 26 56, 44 42";

// [path, drawing order]: the body first, then the details together.
const LINES: [string, number][] = [
  [`${BODY} C 50 37, 56 34, 62 31`, 0],
  ["M138 56 C 150 54, 156 60, 154 68 C 152 76, 144 78, 136 74", 1],
  ["M145 62 L 145 66", 1],
  ["M149 62 L 149 66", 1],
  ["M64 34 C 62 24, 66 16, 70 14 C 76 20, 80 26, 82 30", 1],
  ["M116 52 L 116 55", 1],
  ["M58 100 L 58 114", 1],
  ["M74 103 L 74 116", 1],
  ["M104 103 L 104 116", 1],
  ["M120 99 L 120 112", 1],
  ["M30 70 C 20 66, 16 74, 22 78 C 28 82, 28 70, 18 72", 1],
  ["M82 31 L 100 30", 1],
];

const COINS = [0, 1, 2];

export function PiggyBank({ label }: { label: string }) {
  const svgRef = useRef<SVGSVGElement>(null);
  const inView = useInView(svgRef, { once: true, amount: 0.6 });
  const clipId = useId();
  useDoodleDrawing(svgRef, true);

  return (
    <figure className="flex flex-col items-center gap-4">
      <svg
        ref={svgRef}
        viewBox="0 0 170 130"
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden
        data-drawn={inView || undefined}
        className="doodle h-36 w-48 overflow-visible text-ink md:h-44 md:w-60"
      >
        <defs>
          <clipPath id={clipId}>
            <path d={`${BODY} Z`} />
          </clipPath>
        </defs>
        <g clipPath={`url(#${clipId})`}>
          <motion.rect
            x={0}
            width={170}
            height={130}
            stroke="none"
            className="fill-accent/20"
            initial={{ attrY: 106 }}
            animate={inView ? { attrY: 50 } : undefined}
            transition={{ duration: 1.6, delay: 1.8, ease: ease.out }}
          />
        </g>
        {LINES.map(([d, order]) => (
          <path
            key={d}
            d={d}
            vectorEffect="non-scaling-stroke"
            style={{ "--doodle-index": order } as CSSProperties}
          />
        ))}
        {COINS.map((coin) => (
          <motion.circle
            key={coin}
            cx={91}
            r={6}
            className="fill-accent"
            stroke="none"
            initial={{ cy: -20, opacity: 0 }}
            animate={inView ? { cy: [-20, 28], opacity: [0, 1, 0] } : undefined}
            transition={{
              duration: 0.6,
              delay: 1 + coin * 0.35,
              ease: "easeIn",
            }}
          />
        ))}
      </svg>
      <figcaption>
        <BracketLabel className="text-ink-2">{label}</BracketLabel>
      </figcaption>
    </figure>
  );
}
