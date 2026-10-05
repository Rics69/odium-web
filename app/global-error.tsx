"use client";

import { useEffect } from "react";
import { buttonClasses } from "@/components/ui/button";
import { cn } from "@/lib/cn";
import { locale, t } from "@/lib/i18n";
import { displayFace, inter } from "./fonts";
import "./globals.css";

// Replaces the root layout when it fails, so it brings its own document,
// styles and fonts. Kept simple: no providers, no animation.
export default function GlobalError({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <html lang={locale} className={cn(inter.variable, displayFace.variable)}>
      <body className="flex min-h-dvh flex-col items-center justify-center gap-6 px-4 text-center">
        <title>{t("error.title")}</title>
        <h1 className="font-display text-h2">{t("error.title")}</h1>
        <p className="max-w-md text-lg text-ink-2">{t("error.text")}</p>
        <button
          type="button"
          onClick={() => retry()}
          className={buttonClasses()}
        >
          {t("error.retry")}
        </button>
      </body>
    </html>
  );
}
