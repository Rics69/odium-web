import type { ComponentProps } from "react";
import { cn } from "@/lib/cn";

// A border at rest. An interactive card lifts on hover and trades the border
// for a shadow (the skill: border or shadow, never both).
export function Card({
  interactive = false,
  className,
  ...props
}: ComponentProps<"div"> & { interactive?: boolean }) {
  return (
    <div
      className={cn(
        "rounded-lg border border-line bg-surface p-6",
        interactive &&
          "transition-[translate,box-shadow,border-color] duration-200 ease-out hover:-translate-y-1 hover:border-transparent hover:shadow-md",
        className,
      )}
      {...props}
    />
  );
}
