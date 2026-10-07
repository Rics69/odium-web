import { buttonClasses } from "@/components/ui/button";
import { cn } from "@/lib/cn";
import { storeLabel } from "@/lib/games";
import { t } from "@/lib/i18n";
import type { PlatformLink } from "@/lib/validation/games";

// Where to get the game. A store without a link yet reads «Скоро в …».
export function StoreLinks({ links }: { links: PlatformLink[] }) {
  if (links.length === 0) return null;

  return (
    <ul className="flex flex-wrap gap-3">
      {links.map((link) => (
        <li key={link.store}>
          {link.url ? (
            <a
              href={link.url}
              target="_blank"
              rel="noopener noreferrer"
              className={cn(buttonClasses("secondary"), "group")}
            >
              {storeLabel(link.store)}
              <svg
                viewBox="0 0 20 20"
                aria-hidden
                className="size-4 transition-[translate] duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M6 14 14 6M7 6h7v7" />
              </svg>
            </a>
          ) : (
            <span className="inline-flex min-h-11 items-center rounded-md border border-dashed border-line-strong px-6 text-ink-2">
              {t("game.soonIn", { store: storeLabel(link.store) })}
            </span>
          )}
        </li>
      ))}
    </ul>
  );
}
