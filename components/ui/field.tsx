import { useId, type ComponentProps, type ReactNode } from "react";
import { cn } from "@/lib/cn";

type ControlProps = {
  id: string;
  "aria-describedby"?: string;
  "aria-invalid"?: true;
};

type FieldProps = {
  label: ReactNode;
  hint?: ReactNode;
  error?: ReactNode;
  // Character counter, e.g. for the wish title and description.
  count?: { value: number; max: number };
  children: (control: ControlProps) => ReactNode;
  className?: string;
};

// Label, control, hint, error and counter, wired together for screen readers.
export function Field({
  label,
  hint,
  error,
  count,
  children,
  className,
}: FieldProps) {
  const id = useId();
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const describedBy = [errorId, hintId].filter(Boolean).join(" ") || undefined;
  const over = count ? count.value > count.max : false;

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <label htmlFor={id} className="text-sm font-medium text-ink">
        {label}
      </label>
      {children({
        id,
        "aria-describedby": describedBy,
        "aria-invalid": error ? true : undefined,
      })}
      {(hint || error || count) && (
        <div className="flex gap-4 text-sm">
          <div className="flex flex-1 flex-col gap-1">
            {error && (
              <p id={errorId} className="text-error">
                {error}
              </p>
            )}
            {hint && (
              <p id={hintId} className="text-ink-2">
                {hint}
              </p>
            )}
          </div>
          {count && (
            <p
              className={cn("tabular-nums", over ? "text-error" : "text-ink-2")}
            >
              {count.value} / {count.max}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

// Focus: accent border plus a soft glow (2px total edge, as in the skill).
const control = cn(
  "w-full rounded-md border border-line-strong bg-surface px-4 py-3 text-base text-ink placeholder:text-ink-3",
  "transition-[border-color,box-shadow] duration-150",
  "focus:border-accent focus:shadow-[0_0_0_1px_var(--accent),0_0_0_4px_color-mix(in_oklab,var(--accent)_15%,transparent)] focus:outline-none",
  "aria-invalid:border-error aria-invalid:focus:shadow-[0_0_0_1px_var(--color-error),0_0_0_4px_color-mix(in_oklab,var(--color-error)_15%,transparent)]",
  "disabled:cursor-not-allowed disabled:bg-paper disabled:text-ink-3",
);

export function Input({ className, ...props }: ComponentProps<"input">) {
  return <input className={cn(control, "min-h-11", className)} {...props} />;
}

export function Textarea({ className, ...props }: ComponentProps<"textarea">) {
  return (
    <textarea
      className={cn(control, "min-h-32 resize-y", className)}
      {...props}
    />
  );
}

// A native list: the phone's own picker, keyboard and screen readers for free.
export function Select({ className, ...props }: ComponentProps<"select">) {
  return (
    <select
      className={cn(control, "min-h-11 py-2 pr-10", className)}
      {...props}
    />
  );
}
