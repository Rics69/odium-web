import Link from "next/link";
import type { ComponentProps } from "react";
import { Doodle } from "@/components/doodles/doodle";
import { cn } from "@/lib/cn";

// Accent link: a quiet underline at rest, a hand-drawn wave on hover.
export function TextLink({
  className,
  children,
  ...props
}: ComponentProps<typeof Link>) {
  return (
    <Link
      className={cn(
        "group relative inline-block font-medium text-accent underline decoration-accent/30 decoration-1 underline-offset-4 transition-colors hover:text-accent-deep hover:decoration-transparent",
        className,
      )}
      {...props}
    >
      {children}
      <Doodle
        name="underline"
        draw="hover"
        className="pointer-events-none absolute inset-x-0 -bottom-1.5 h-2 w-full"
      />
    </Link>
  );
}
