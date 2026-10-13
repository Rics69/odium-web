"use client";

import { useInView, useReducedMotionConfig } from "framer-motion";
import { useEffect, useRef, useState } from "react";

const DURATION_MS = 900;

// A number that counts up from zero when it scrolls into view. Without
// JavaScript (or motion) it simply shows the value. A frame loop, not
// Motion's animate: that would bring its whole animation engine for a count.
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
    let start: number | undefined;
    let frame = requestAnimationFrame(function tick(now) {
      start ??= now;
      const progress = Math.min((now - start) / DURATION_MS, 1);
      // Ease-out: quick at first, settling on the value.
      setShown(Math.round(value * (1 - (1 - progress) ** 3)));
      if (progress < 1) frame = requestAnimationFrame(tick);
    });
    return () => cancelAnimationFrame(frame);
  }, [inView, reduceMotion, value]);

  return (
    <span ref={ref} className={className}>
      {shown}
    </span>
  );
}
