"use client";

import { MotionConfig } from "motion/react";
import type { ReactNode } from "react";

// Respects the system "reduce motion" setting for every Motion animation.
export function MotionProvider({ children }: { children: ReactNode }) {
  return <MotionConfig reducedMotion="user">{children}</MotionConfig>;
}
