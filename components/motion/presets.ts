import type { Transition } from "motion/react";

// Motion tokens. CSS counterparts live in app/globals.css (--ease-*).
export const ease = {
  out: [0.22, 1, 0.36, 1],
} as const;

export const spring = {
  // Presses and toggles: quick, no wobble.
  snappy: { type: "spring", stiffness: 500, damping: 32 },
  // Playful pops: a visible bounce.
  bouncy: { type: "spring", stiffness: 380, damping: 16 },
  // Content appearing on scroll.
  soft: { type: "spring", stiffness: 140, damping: 22 },
} as const satisfies Record<string, Transition>;
