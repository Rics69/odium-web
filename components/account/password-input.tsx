"use client";

import { useState, type ComponentProps } from "react";
import { Input } from "@/components/ui/field";
import { t } from "@/lib/i18n";

// A password field with an eye to check what was typed (phones especially).
export function PasswordInput(props: Omit<ComponentProps<"input">, "type">) {
  const [visible, setVisible] = useState(false);
  return (
    <div className="relative">
      <Input
        {...props}
        type={visible ? "text" : "password"}
        className="pr-14"
      />
      <button
        type="button"
        onClick={() => setVisible((value) => !value)}
        aria-label={t(
          visible
            ? "account.fields.hidePassword"
            : "account.fields.showPassword",
        )}
        aria-pressed={visible}
        className="absolute inset-y-0 right-0 grid w-12 place-items-center rounded-r-md text-ink-2 transition-colors hover:text-accent"
      >
        <svg
          aria-hidden
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.75"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="size-5"
        >
          <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z" />
          <circle cx="12" cy="12" r="3" />
          {visible && <path d="M4 20 20 4" />}
        </svg>
      </button>
    </div>
  );
}
