import { Doodle } from "@/components/doodles/doodle";
import { SiteFooter } from "@/components/site/site-footer";
import { SiteHeader } from "@/components/site/site-header";
import { LinkButton } from "@/components/ui/button";
import { t } from "@/lib/i18n";

// Any unknown address and every notFound(). The zero in 404 is drawn by hand.
export default function NotFound() {
  return (
    <>
      <SiteHeader />
      <main
        id="content"
        tabIndex={-1}
        className="flex flex-1 flex-col items-center justify-center gap-6 px-4 py-16 text-center outline-none"
      >
        <p aria-hidden className="flex items-center font-display text-display">
          4
          <span className="relative mx-[0.06em] inline-block h-[0.72em] w-[0.56em] text-accent transition-[rotate] duration-500 hover:rotate-12">
            <Doodle
              name="outline"
              draw="view"
              strokeWidth={8}
              className="absolute inset-0 size-full -rotate-6"
            />
          </span>
          4
        </p>
        <h1 className="font-display text-h2">{t("notFound.title")}</h1>
        <p className="max-w-md text-lg text-ink-2">{t("notFound.text")}</p>
        <LinkButton href="/" className="mt-4">
          {t("notFound.home")}
        </LinkButton>
      </main>
      <SiteFooter />
    </>
  );
}
