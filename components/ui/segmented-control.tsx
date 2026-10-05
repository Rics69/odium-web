"use client";

import { motion } from "motion/react";
import { useId, type ReactNode } from "react";
import { spring } from "@/components/motion/presets";
import { cn } from "@/lib/cn";

type Option<T extends string> = { value: T; label: ReactNode };

type SegmentedControlProps<T extends string> = {
  label: string;
  options: Option<T>[];
  value: T;
  onChange: (value: T) => void;
  className?: string;
};

// Radio buttons that look like a switch; the white pill slides to the choice.
// Native radios keep keyboard support (arrows) and screen reader semantics.
export function SegmentedControl<T extends string>({
  label,
  options,
  value,
  onChange,
  className,
}: SegmentedControlProps<T>) {
  const id = useId();

  return (
    <fieldset
      className={cn(
        "inline-flex flex-wrap rounded-md border border-line bg-paper p-1",
        className,
      )}
    >
      <legend className="sr-only">{label}</legend>
      {options.map((option) => {
        const checked = option.value === value;
        return (
          <label
            key={option.value}
            className={cn(
              "relative flex min-h-11 cursor-pointer items-center justify-center rounded-sm px-4 text-sm font-medium transition-colors",
              "has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-accent",
              checked ? "text-ink" : "text-ink-2 hover:text-ink",
            )}
          >
            <input
              type="radio"
              name={id}
              value={option.value}
              checked={checked}
              onChange={() => onChange(option.value)}
              className="sr-only"
            />
            {checked && (
              <motion.span
                layoutId={id}
                transition={spring.snappy}
                className="absolute inset-0 rounded-sm bg-surface shadow-sm"
              />
            )}
            <span className="relative inline-flex items-center gap-2">
              {option.label}
            </span>
          </label>
        );
      })}
    </fieldset>
  );
}
