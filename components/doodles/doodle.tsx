"use client";

import { useInView } from "motion/react";
import {
  useLayoutEffect,
  useRef,
  type CSSProperties,
  type RefObject,
} from "react";
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
  // Faces for the team stickers while there are no photos.
  "face-cap": {
    viewBox: "0 0 100 100",
    paths: [
      "M50 18 C 72 17, 84 34, 83 53 C 82 74, 66 86, 49 85 C 30 84, 17 70, 18 51 C 19 32, 31 19, 52 18",
      "M22 38 C 30 20, 68 17, 79 34 L 94 37",
      "M39 50 L 39 54",
      "M61 50 L 61 54",
      "M38 64 C 45 72, 57 72, 64 63",
    ],
  },
  "face-glasses": {
    viewBox: "0 0 100 100",
    paths: [
      "M50 18 C 72 17, 84 34, 83 53 C 82 74, 66 86, 49 85 C 30 84, 17 70, 18 51 C 19 32, 31 19, 52 18",
      "M28 50 C 28 42, 44 42, 44 50 C 44 58, 28 58, 28 50",
      "M56 50 C 56 42, 72 42, 72 50 C 72 58, 56 58, 56 50",
      "M44 49 C 48 46, 52 46, 56 49",
      "M40 66 C 46 71, 55 71, 61 65",
    ],
  },
  "face-curly": {
    viewBox: "0 0 100 100",
    paths: [
      "M50 18 C 72 17, 84 34, 83 53 C 82 74, 66 86, 49 85 C 30 84, 17 70, 18 51 C 19 32, 31 19, 52 18",
      "M22 38 C 18 24, 32 20, 34 30 C 34 16, 50 16, 49 27 C 50 14, 66 16, 64 27 C 68 16, 84 22, 78 38",
      "M39 51 C 40 49, 42 49, 43 51",
      "M57 51 C 58 49, 60 49, 61 51",
      "M42 64 C 47 69, 54 69, 59 64",
    ],
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

/**
 * Prepares the paths inside an SVG for the drawing animation in
 * app/globals.css (.doodle): measures each path on screen, again on resize.
 */
export function useDoodleDrawing(
  svgRef: RefObject<SVGSVGElement | null>,
  enabled: boolean,
) {
  useLayoutEffect(() => {
    const svg = svgRef.current;
    if (!enabled || !svg) return;
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
  }, [svgRef, enabled]);
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

  useDoodleDrawing(svgRef, animated);

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
