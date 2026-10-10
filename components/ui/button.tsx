"use client";

import { motion, type HTMLMotionProps } from "motion/react";
import Link from "next/link";
import type { ComponentProps } from "react";
import { Doodle } from "@/components/doodles/doodle";
import { spring } from "@/components/motion/presets";
import { cn } from "@/lib/cn";
import { buttonClasses, type ButtonVariant } from "./button-classes";

export { buttonClasses, type ButtonVariant };

type ButtonProps = HTMLMotionProps<"button"> & {
  variant?: ButtonVariant;
  // A hand-drawn outline around the button, for the one main action on a screen.
  doodle?: boolean;
  loading?: boolean;
};

export function Button({
  variant = "primary",
  doodle = false,
  loading = false,
  disabled,
  className,
  children,
  ...props
}: ButtonProps) {
  const inactive = Boolean(disabled) || loading;

  return (
    <motion.button
      type="button"
      disabled={inactive}
      aria-busy={loading || undefined}
      whileHover={inactive ? undefined : "hover"}
      whileTap={inactive ? undefined : { scale: 0.96 }}
      transition={spring.snappy}
      className={cn(buttonClasses(variant), className)}
      {...props}
    >
      {doodle && (
        <motion.span
          aria-hidden
          className="pointer-events-none absolute -inset-x-5 -inset-y-3.5 text-ink/70"
          variants={{ hover: { rotate: [0, -1.5, 1, 0] } }}
          transition={{ duration: 0.45 }}
        >
          <Doodle name="outline" draw="view" className="size-full" />
        </motion.span>
      )}
      {loading && (
        <span aria-hidden className="absolute inset-0 grid place-items-center">
          <span className="size-5 animate-spin rounded-full border-2 border-current border-t-transparent" />
        </span>
      )}
      <span
        className={cn("inline-flex items-center gap-2", loading && "invisible")}
      >
        {children as React.ReactNode}
      </span>
    </motion.button>
  );
}

type LinkButtonProps = ComponentProps<typeof Link> & {
  variant?: ButtonVariant;
  // The hand-drawn outline, as on Button; it tilts while the link is hovered.
  doodle?: boolean;
};

// A link that looks like a button (navigation, not an action).
export function LinkButton({
  variant = "primary",
  doodle = false,
  className,
  children,
  ...props
}: LinkButtonProps) {
  return (
    <Link
      className={cn(
        buttonClasses(variant),
        "group active:scale-[0.97]",
        className,
      )}
      {...props}
    >
      {doodle && (
        <span
          aria-hidden
          className="pointer-events-none absolute -inset-x-5 -inset-y-3.5 text-ink/70 transition-[rotate] duration-300 group-hover:-rotate-2"
        >
          <Doodle name="outline" draw="view" className="size-full" />
        </span>
      )}
      {children}
    </Link>
  );
}
