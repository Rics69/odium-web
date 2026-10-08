import type { ReactNode } from "react";
import { Doodle } from "@/components/doodles/doodle";

// Sign-up, sign-in and the pages around them: one narrow column, a big
// title with a hand-drawn underline, then the form.
export function AuthFrame({
  title,
  lead,
  children,
  footer,
}: {
  title: string;
  lead?: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <section className="mx-auto flex w-full max-w-md flex-col gap-8 px-4 py-12 md:py-20">
      <div className="flex flex-col gap-3">
        <h1 className="relative w-fit font-display text-h1">
          {title}
          <Doodle
            name="underline"
            draw="view"
            className="absolute inset-x-0 -bottom-2 h-3 w-full text-accent"
          />
        </h1>
        {lead && <p className="text-ink-2">{lead}</p>}
      </div>
      {children}
      {footer && <div className="text-center text-ink-2">{footer}</div>}
    </section>
  );
}
