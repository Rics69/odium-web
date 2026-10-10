"use client";

import { Dialog as RadixDialog } from "radix-ui";
import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

export const Dialog = RadixDialog.Root;
export const DialogTrigger = RadixDialog.Trigger;
export const DialogClose = RadixDialog.Close;

type DialogContentProps = {
  title: ReactNode;
  description?: ReactNode;
  closeLabel: string;
  children?: ReactNode;
  // A whole screen on phones, for forms; a wider card from 768px.
  fullScreenOnPhone?: boolean;
  className?: string;
};

// A sheet that slides up from the bottom on phones, a centred card from 768px.
// Radix keeps focus inside, closes on Esc and on a click outside.
export function DialogContent({
  title,
  description,
  closeLabel,
  children,
  fullScreenOnPhone = false,
  className,
}: DialogContentProps) {
  return (
    <RadixDialog.Portal>
      {/* "safe": a dialog taller than the screen starts at its top and
          scrolls, instead of spilling over the top edge out of reach. */}
      <RadixDialog.Overlay className="fixed inset-0 z-50 grid place-items-end-safe overflow-y-auto bg-ink/40 data-[state=closed]:animate-overlay-out data-[state=open]:animate-overlay-in md:place-items-center-safe md:p-6">
        <RadixDialog.Content
          className={cn(
            "relative w-full bg-surface p-6 pb-8 shadow-md md:rounded-lg md:pb-6",
            fullScreenOnPhone
              ? "min-h-dvh md:min-h-0 md:max-w-xl"
              : "rounded-t-lg md:max-w-md",
            "data-[state=closed]:animate-sheet-out data-[state=open]:animate-sheet-in md:data-[state=closed]:animate-pop-out md:data-[state=open]:animate-pop-in",
            className,
          )}
        >
          {!fullScreenOnPhone && (
            <div
              aria-hidden
              className="mx-auto mb-6 h-1 w-10 rounded-full bg-line md:hidden"
            />
          )}
          <RadixDialog.Title className="pr-12 font-display text-h3">
            {title}
          </RadixDialog.Title>
          {description ? (
            <RadixDialog.Description className="mt-2 text-ink-2">
              {description}
            </RadixDialog.Description>
          ) : (
            <RadixDialog.Description className="sr-only">
              {title}
            </RadixDialog.Description>
          )}
          {children && <div className="mt-6">{children}</div>}
          <RadixDialog.Close
            aria-label={closeLabel}
            className="absolute top-4 right-4 grid size-11 place-items-center rounded-md text-ink-2 transition-[color,background-color,rotate] duration-200 hover:rotate-90 hover:bg-ink/5 hover:text-ink"
          >
            <svg
              viewBox="0 0 24 24"
              className="size-5"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              strokeLinecap="round"
              aria-hidden
            >
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </RadixDialog.Close>
        </RadixDialog.Content>
      </RadixDialog.Overlay>
    </RadixDialog.Portal>
  );
}
