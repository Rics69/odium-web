"use client";

import { useEffect } from "react";
import { Doodle } from "@/components/doodles/doodle";
import { Button, LinkButton } from "@/components/ui/button";
import { t } from "@/lib/i18n";

// Header and footer stay: this boundary sits inside the public layout.
export default function ErrorPage({
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
    <section className="flex min-h-[60dvh] flex-col items-center justify-center gap-6 px-4 py-16 text-center">
      <Doodle name="scribble" draw="view" className="h-16 w-48 text-accent" />
      <h1 className="font-display text-h2">{t("error.title")}</h1>
      <p className="max-w-md text-lg text-ink-2">{t("error.text")}</p>
      <div className="flex flex-wrap justify-center gap-4">
        <Button onClick={() => retry()}>{t("error.retry")}</Button>
        <LinkButton href="/" variant="secondary">
          {t("error.home")}
        </LinkButton>
      </div>
    </section>
  );
}
