import { cn } from "@/lib/cn";

// The studio's penguin from the logo, in pixels: the curl on his head,
// sunglasses, a bottle he drinks from through a straw. One character is one
// pixel: K ink, W paper (belly and glasses), C the curl, F the feet, 1–3
// the drink in the bottle from its top row down.
const ROWS = [
  ".CCC................",
  "C...C...............",
  "C.C.C...............",
  ".CC.C..KKK..........",
  "....KKKKKKKK........",
  "...KKKKKKKKKK.......",
  "..KKKKKKKKKKKK......",
  ".KKKKKWWWWWWWK......",
  ".KKKKKWWWKWWWKKK....",
  ".KKKKKKWWKKWWKKKKKK.",
  ".KKKKKKKKKKKKKKK....",
  ".KKKKKKKKKKKKKK.KK..",
  ".KKKKKKWWWWKKKK..K..",
  "KKKKKWWWWWWWKKK.KKK.",
  "KKKKWWWWWWKWKKK..K..",
  "KKKKWWWWWWKKWKK..K..",
  "KKKKWWWWWWKKKWK.KKK.",
  "KKKKWWWWWWKKKKWK...K",
  "KKKKWWWWWWWKKKKKK..K",
  "KKKKWWWWWWWKKKKKKK.K",
  "KKKKWWWWWWWWKKKKKK.K",
  "KKKKWWWWWWWWKK.K...K",
  "KKKKWWWWWWWWKK.K111K",
  "KKKKWWWWWWWWKK.K222K",
  ".KKKWWWWWWWWKK.K333K",
  ".KKKKWWWWWWWKK.KKKKK",
  "..KKKKWWWWWKKK.KKKKK",
  "...KKKKKKKKKK.......",
  "..FFFFFFFFFFFF......",
];

const WIDTH = ROWS[0]!.length;
const HEIGHT = ROWS.length;
// Screen pixels per pixel of the drawing on a computer; phones take 1.5
// (className below), which on their dense screens is still whole pixels.
const SCALE = 2;

// Ink on paper, like the logo itself.
const INK = "var(--color-ink)";
const fills: Record<string, string> = {
  K: INK,
  C: INK,
  F: INK,
  W: "var(--color-paper)",
  "1": INK,
  "2": INK,
  "3": INK,
};

type Run = { char: string; x: number; y: number; width: number };

// Same-coloured neighbours in a row become one rectangle.
const runs: Run[] = ROWS.flatMap((row, y) => {
  const found: Run[] = [];
  [...row].forEach((char, x) => {
    const last = found.at(-1);
    if (last && last.char === char && last.x + last.width === x) {
      last.width += 1;
    } else if (char !== ".") {
      found.push({ char, x, y, width: 1 });
    }
  });
  return found;
});

const pixels = (list: Run[]) =>
  list.map(({ char, x, y, width }) => (
    <rect
      key={`${x}-${y}`}
      x={x}
      y={y}
      width={width}
      height={1}
      fill={fills[char]}
    />
  ));

const only = (chars: string) => runs.filter((run) => chars.includes(run.char));

/**
 * The penguin: hops in with the letters of the logo, sways to a beat, his
 * curl swinging, and sips the bottle row by row (it refills, of course).
 * Plain CSS in app/globals.css (.penguin), so it never waits for
 * JavaScript; with reduced motion he just stands there.
 */
export function Penguin({ className }: { className?: string }) {
  return (
    <svg
      data-penguin
      viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
      width={WIDTH * SCALE}
      height={HEIGHT * SCALE}
      shapeRendering="crispEdges"
      aria-hidden
      className={cn("penguin h-auto w-[30px] shrink-0 md:w-10", className)}
    >
      <g className="penguin-body">
        {pixels(only("KW"))}
        <g className="penguin-curl">{pixels(only("C"))}</g>
        {["1", "2", "3"].map((level) => (
          <g key={level} className={`penguin-drink-${level}`}>
            {pixels(only(level))}
          </g>
        ))}
      </g>
      {/* The feet stay put while the body sways over them. */}
      {pixels(only("F"))}
    </svg>
  );
}
