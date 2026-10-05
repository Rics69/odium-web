import Link from "next/link";
import { BracketLabel } from "@/components/ui/bracket-label";
import { t } from "@/lib/i18n";
import { PiggyBank } from "./piggy-bank";
import { SocialLinks, type Social } from "./social-links";

type SiteFooterProps = {
  mission?: string;
  socials?: Social[];
};

// The studio's goal with the piggy bank, links, and a giant faded wordmark
// that the bottom edge of the page cuts off.
export function SiteFooter({
  mission = t("studio.mission"),
  socials = [],
}: SiteFooterProps) {
  const year = new Date().getFullYear();

  return (
    <footer className="relative mt-24 overflow-hidden border-t border-line">
      <div className="mx-auto grid max-w-6xl gap-12 px-4 pt-16 md:grid-cols-[1fr_auto] md:items-center md:px-8">
        <div className="flex flex-col gap-4">
          <BracketLabel className="text-ink-2">
            {t("footer.missionLabel")}
          </BracketLabel>
          <p className="max-w-2xl font-display text-h2">{mission}</p>
        </div>
        <PiggyBank label={t("footer.piggyBank")} />
      </div>

      <div className="mx-auto mt-16 flex max-w-6xl flex-col gap-4 px-4 md:flex-row md:items-center md:justify-between md:px-8">
        <nav aria-label={t("footer.linksLabel")}>
          <Link
            href="/games"
            className="group inline-flex min-h-11 items-center text-ink-2 transition-colors hover:text-accent"
          >
            <BracketLabel>{t("nav.games")}</BracketLabel>
          </Link>
        </nav>
        {socials.length > 0 && (
          <SocialLinks socials={socials} label={t("footer.socialsLabel")} />
        )}
        <p className="text-sm text-ink-2">{t("footer.copyright", { year })}</p>
      </div>

      <p
        aria-hidden
        className="pointer-events-none mt-8 -mb-[0.2em] text-center font-display text-[24vw] leading-[0.8] text-line select-none"
      >
        ODIUM
      </p>
    </footer>
  );
}
