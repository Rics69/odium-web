"use client";

import { LazyMotion, MotionConfig } from "framer-motion";
import type { ReactNode } from "react";

const loadFeatures = () =>
  import("./features").then((module) => module.default);

// Motion components are the light `m` ones: what they can do arrives in a
// separate file once the page is up, so it never holds the first paint.
// `strict` makes a stray full `motion` component an error. Respects the
// system "reduce motion" setting for every Motion animation.
//
// Motion is imported as `framer-motion`, not `motion/react`: that entry
// re-exports the library as one namespace, and the bundler then ships all of
// it, the lazy features included, with the first page (−44 KB gzip).
export function MotionProvider({ children }: { children: ReactNode }) {
  return (
    <LazyMotion features={loadFeatures} strict>
      <MotionConfig reducedMotion="user">{children}</MotionConfig>
    </LazyMotion>
  );
}
