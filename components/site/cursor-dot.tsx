"use client";

import { useReducedMotionConfig } from "framer-motion";
import dynamic from "next/dynamic";
import { useSyncExternalStore } from "react";

// Only for a real mouse: phones and tablets keep their plain touch.
const MOUSE = "(hover: hover) and (pointer: fine)";

// The dot's code loads only where it shows: phones never download it.
const CursorFollower = dynamic(() => import("./cursor-follower"), {
  ssr: false,
});

function subscribe(onChange: () => void) {
  const query = window.matchMedia(MOUSE);
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
}

// An accent dot that trails the mouse, when there is a mouse and motion is
// welcome.
export function CursorDot() {
  const hasMouse = useSyncExternalStore(
    subscribe,
    () => window.matchMedia(MOUSE).matches,
    () => false,
  );
  const reduceMotion = useReducedMotionConfig();
  return hasMouse && !reduceMotion ? <CursorFollower /> : null;
}
