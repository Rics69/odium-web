import { cn } from "@/lib/cn";

// Placeholder while content loads: a gentle pulse, no gradients.
export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      aria-hidden
      className={cn("animate-pulse rounded-md bg-line", className)}
    />
  );
}
