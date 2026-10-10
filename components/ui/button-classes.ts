import { cn } from "@/lib/cn";

// Apart from button.tsx, a client module: server components (the store
// links of a game page) call it to dress a plain link as a button.

export type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";

const variants: Record<ButtonVariant, string> = {
  primary:
    "bg-accent text-white shadow-sm hover:bg-accent-deep hover:shadow-md disabled:bg-line disabled:text-ink-3 disabled:shadow-none",
  secondary:
    "border border-line-strong bg-surface text-ink hover:border-ink-3 disabled:border-line disabled:text-ink-3",
  ghost:
    "text-ink hover:bg-ink/5 disabled:text-ink-3 disabled:hover:bg-transparent",
  // For what cannot be undone, such as deleting the account.
  danger:
    "bg-error text-white shadow-sm hover:shadow-md hover:brightness-95 disabled:bg-line disabled:text-ink-3 disabled:shadow-none",
};

// 44px tall at least (touch target), 12/24px padding, 8px corners — as in the skill.
export function buttonClasses(variant: ButtonVariant = "primary") {
  return cn(
    "relative inline-flex min-h-11 items-center justify-center gap-2 rounded-md px-6 py-3 text-base font-medium whitespace-nowrap select-none",
    "transition-[background-color,border-color,box-shadow,translate] duration-150 ease-out",
    "hover:-translate-y-px active:translate-y-0 disabled:cursor-not-allowed disabled:hover:translate-y-0",
    variants[variant],
  );
}
