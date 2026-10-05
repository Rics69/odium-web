"use client";

import { useInView } from "motion/react";
import { useLayoutEffect, useRef, type CSSProperties } from "react";
import { cn } from "@/lib/cn";

type Shape = {
  viewBox: string;
  paths: string[];
  // Stretch to any box (outlines around buttons); otherwise keep proportions.
  stretch?: boolean;
};

// Hand-drawn shapes: slightly uneven curves, ends that overshoot, round caps.
const shapes = {
  outline: {
    viewBox: "0 0 200 80",
    stretch: true,
    paths: [
      "M30 13 C 70 3, 150 4, 184 15 C 201 22, 200 54, 181 64 C 150 78, 62 80, 25 69 C 4 61, 2 33, 19 20 C 33 10, 64 6, 102 7",
    ],
  },
  underline: {
    viewBox: "0 0 200 16",
    stretch: true,
    paths: ["M3 10 C 28 4, 46 14, 70 9 S 112 3, 136 9 S 176 13, 197 6"],
  },
  arrow: {
    viewBox: "0 0 120 90",
    paths: ["M10 80 C 14 46, 44 18, 104 16", "M86 4 L 106 16 L 88 30"],
  },
  sparkle: {
    viewBox: "0 0 48 48",
    paths: [
      "M24 3 C 25 17, 31 23, 45 24 C 31 25, 25 31, 24 45 C 23 31, 17 25, 3 24 C 17 23, 23 17, 24 3 Z",
    ],
  },
  scribble: {
    viewBox: "0 0 160 60",
    paths: [
      "M6 44 C 14 10, 34 8, 30 30 C 27 46, 14 40, 22 26 C 32 8, 54 8, 52 30 C 50 46, 38 40, 46 26 C 56 8, 78 8, 76 30 C 74 46, 62 40, 70 26 C 80 8, 102 8, 100 30 C 98 46, 86 40, 94 26 C 104 8, 126 10, 124 32 C 122 44, 132 46, 154 40",
    ],
  },
  check: {
    viewBox: "0 0 48 40",
    paths: ["M4 22 C 9 25, 13 30, 17 36 C 24 22, 32 11, 45 3"],
  },
} satisfies Record<string, Shape>;

export type DoodleName = keyof typeof shapes;

type DoodleProps = {
  name: DoodleName;
  // static: always drawn · view: draws itself when scrolled into view ·
  // hover: draws while the nearest .group is hovered or focused.
  draw?: "static" | "view" | "hover";
  className?: string;
  // In screen pixels at any size: the line keeps one pen width everywhere.
  strokeWidth?: number;
};

const SAMPLES = 48;

// Length of a path as drawn on screen. With non-scaling strokes the browser
// measures dashes in screen pixels, so the drawing animation needs this
// length rather than the one in viewBox units.
function screenLength(path: SVGPathElement) {
  const matrix = path.getScreenCTM();
  if (!matrix) return 0;
  const total = path.getTotalLength();
  let length = 0;
  let previous: DOMPoint | null = null;
  for (let i = 0; i <= SAMPLES; i += 1) {
    const point = path
      .getPointAtLength((total * i) / SAMPLES)
      .matrixTransform(matrix);
    if (previous)
      length += Math.hypot(point.x - previous.x, point.y - previous.y);
    previous = point;
  }
  return Math.ceil(length) + 1;
}

export function Doodle({
  name,
  draw = "static",
  className,
  strokeWidth = 2,
}: DoodleProps) {
  const shape: Shape = shapes[name];
  const svgRef = useRef<SVGSVGElement>(null);
  const inView = useInView(svgRef, { once: true, amount: 0.5 });
  const animated = draw !== "static";

  useLayoutEffect(() => {
    const svg = svgRef.current;
    if (!animated || !svg) return;
    const measure = () => {
      svg.querySelectorAll("path").forEach((path) => {
        path.style.setProperty("--doodle-length", `${screenLength(path)}px`);
      });
      svg.dataset.measured = "";
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(svg);
    return () => observer.disconnect();
  }, [animated]);

  return (
    <svg
      ref={svgRef}
      viewBox={shape.viewBox}
      preserveAspectRatio={shape.stretch ? "none" : undefined}
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      data-drawn={(draw === "view" && inView) || undefined}
      className={cn(
        animated && "doodle",
        draw === "hover" && "doodle-hover",
        className,
      )}
    >
      {shape.paths.map((d, index) => (
        <path
          key={d}
          d={d}
          vectorEffect="non-scaling-stroke"
          style={{ "--doodle-index": index } as CSSProperties}
        />
      ))}
    </svg>
  );
}
