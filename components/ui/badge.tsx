import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

export type BadgeTone = "neutral" | "accent" | "add" | "remove";

const tones: Record<BadgeTone, string> = {
  neutral: "border border-line bg-surface text-ink-2",
  accent: "bg-accent/10 text-accent-deep",
  add: "bg-add-soft text-add",
  remove: "bg-remove-soft text-remove",
};

export function Badge({
  tone = "neutral",
  children,
  className,
}: {
  tone?: BadgeTone;
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex h-7 items-center gap-1 rounded-sm px-2 text-sm font-medium whitespace-nowrap",
        tones[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}
