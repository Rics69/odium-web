import type { ReactNode } from "react";
import { Doodle } from "@/components/doodles/doodle";

// Nothing here yet: a doodle draws itself, a short title, one line, an action.
export function EmptyState({
  title,
  text,
  action,
}: {
  title: ReactNode;
  text?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center gap-4 px-6 py-12 text-center">
      <div className="relative h-20 w-32 text-ink">
        <Doodle
          name="scribble"
          draw="view"
          className="absolute inset-x-0 bottom-0 h-12 w-32"
        />
        <Doodle
          name="sparkle"
          draw="view"
          className="absolute -top-1 right-0 size-8 text-accent"
        />
      </div>
      <h3 className="font-display text-h3">{title}</h3>
      {text && <p className="max-w-sm text-ink-2">{text}</p>}
      {action}
    </div>
  );
}
