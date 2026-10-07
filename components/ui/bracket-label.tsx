import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

// [ ИГРЫ ] — a caps label in square brackets; the brackets spread apart when
// the label or a parent .group is hovered.
export function BracketLabel({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  const bracket =
    "text-[1.5em] leading-none font-light transition-[translate] duration-200 ease-[var(--ease-bounce)]";
  return (
    <span
      className={cn(
        "group inline-flex items-center gap-1 text-sm font-medium tracking-label whitespace-nowrap uppercase",
        className,
      )}
    >
      <span aria-hidden className={cn(bracket, "group-hover:-translate-x-1")}>
        [
      </span>
      {children}
      <span aria-hidden className={cn(bracket, "group-hover:translate-x-1")}>
        ]
      </span>
    </span>
  );
}
