"use client";

import { motion } from "motion/react";
import type { ReactNode } from "react";
import { spring } from "./presets";

type RevealProps = {
  children: ReactNode;
  delay?: number;
  className?: string;
};

// Content rises and fades in the first time it scrolls into view.
// Never wrap the main heading of a page: it must be visible immediately (LCP).
export function Reveal({ children, delay = 0, className }: RevealProps) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.3 }}
      transition={{ ...spring.soft, delay }}
    >
      {children}
    </motion.div>
  );
}
