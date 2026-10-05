"use client";

import {
  motion,
  useMotionValue,
  useReducedMotionConfig,
  useSpring,
} from "motion/react";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { spring } from "@/components/motion/presets";

// Only for a real mouse: phones and tablets keep their plain touch.
const MOUSE = "(hover: hover) and (pointer: fine)";
const INTERACTIVE =
  "a, button, label, select, summary, [role='button'], [role='tab']";

type DotState = "hidden" | "idle" | "hover" | "press";

const looks: Record<DotState, { scale: number; opacity: number }> = {
  hidden: { scale: 0, opacity: 0 },
  idle: { scale: 1, opacity: 1 },
  hover: { scale: 4, opacity: 0.25 },
  press: { scale: 0.6, opacity: 1 },
};

function subscribe(onChange: () => void) {
  const query = window.matchMedia(MOUSE);
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
}

// An accent dot that trails the system cursor (which stays visible) and grows
// into a soft halo over anything clickable.
export function CursorDot() {
  const hasMouse = useSyncExternalStore(
    subscribe,
    () => window.matchMedia(MOUSE).matches,
    () => false,
  );
  const reduceMotion = useReducedMotionConfig();
  const enabled = hasMouse && !reduceMotion;

  const x = useMotionValue(-100);
  const y = useMotionValue(-100);
  const smoothX = useSpring(x, { stiffness: 600, damping: 40, mass: 0.4 });
  const smoothY = useSpring(y, { stiffness: 600, damping: 40, mass: 0.4 });
  const [state, setState] = useState<DotState>("hidden");
  const current = useRef<DotState>("hidden");

  useEffect(() => {
    if (!enabled) return;
    const show = (next: DotState) => {
      if (current.current === next) return;
      current.current = next;
      setState(next);
    };
    const move = (event: PointerEvent) => {
      if (event.pointerType !== "mouse") return;
      x.set(event.clientX);
      y.set(event.clientY);
      if (current.current === "press") return;
      const target = event.target as Element | null;
      show(target?.closest(INTERACTIVE) ? "hover" : "idle");
    };
    const press = () => show("press");
    const release = (event: PointerEvent) => {
      const target = event.target as Element | null;
      show(target?.closest(INTERACTIVE) ? "hover" : "idle");
    };
    const leave = () => show("hidden");

    window.addEventListener("pointermove", move);
    window.addEventListener("pointerdown", press);
    window.addEventListener("pointerup", release);
    document.documentElement.addEventListener("pointerleave", leave);
    return () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerdown", press);
      window.removeEventListener("pointerup", release);
      document.documentElement.removeEventListener("pointerleave", leave);
    };
  }, [enabled, x, y]);

  if (!enabled) return null;

  return (
    <motion.div
      aria-hidden
      className="pointer-events-none fixed top-0 left-0 z-[70] size-2.5 -translate-1/2 rounded-full bg-accent ring-2 ring-paper"
      style={{ x: smoothX, y: smoothY }}
      initial={looks.hidden}
      animate={looks[state]}
      transition={spring.snappy}
    />
  );
}
