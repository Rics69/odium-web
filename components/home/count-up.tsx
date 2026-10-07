"use client";

import { animate, useInView, useReducedMotionConfig } from "motion/react";
import { useEffect, useRef, useState } from "react";

// A number that counts up from zero when it scrolls into view. Without
// JavaScript (or motion) it simply shows the value.
export function CountUp({
  value,
  className,
}: {
  value: number;
  className?: string;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.8 });
  const reduceMotion = useReducedMotionConfig();
  const [shown, setShown] = useState(value);

  useEffect(() => {
    if (!inView || reduceMotion) return;
    const controls = animate(0, value, {
      duration: 0.9,
      ease: "easeOut",
      onUpdate: (latest) => setShown(Math.round(latest)),
    });
    return () => controls.stop();
  }, [inView, reduceMotion, value]);

  return (
    <span ref={ref} className={className}>
      {shown}
    </span>
  );
}
