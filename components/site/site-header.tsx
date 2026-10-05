"use client";

import { motion, useMotionValueEvent, useScroll } from "motion/react";
import type { Route } from "next";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, type ReactNode } from "react";
import { spring } from "@/components/motion/presets";
import { BracketLabel } from "@/components/ui/bracket-label";
import { cn } from "@/lib/cn";
import { t } from "@/lib/i18n";
import { Logo } from "./logo";

const HIDE_AFTER_PX = 160;

// Transparent at the top of the page; once scrolled it gets a paper
// background, hides while scrolling down and comes back on the way up.
export function SiteHeader() {
  const pathname = usePathname();
  const { scrollY } = useScroll();
  const [scrolled, setScrolled] = useState(false);
  const [hidden, setHidden] = useState(false);

  useMotionValueEvent(scrollY, "change", (y) => {
    const previous = scrollY.getPrevious() ?? 0;
    setScrolled(y > 8);
    setHidden(y > HIDE_AFTER_PX && y > previous);
  });

  return (
    <>
      <a
        href="#content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-[80] focus:rounded-md focus:bg-surface focus:px-4 focus:py-3 focus:shadow-md"
      >
        {t("nav.skip")}
      </a>
      <motion.header
        animate={{ y: hidden ? "-100%" : "0%" }}
        transition={spring.snappy}
        className={cn(
          "sticky top-0 z-40 border-b transition-[background-color,border-color] duration-300",
          scrolled
            ? "border-line bg-paper/85 backdrop-blur"
            : "border-transparent",
        )}
      >
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 md:h-20 md:px-8">
          <Logo />
          <nav aria-label={t("nav.label")}>
            <ul className="flex items-center gap-2">
              <li>
                <NavLink href="/games" active={pathname.startsWith("/games")}>
                  {t("nav.games")}
                </NavLink>
              </li>
            </ul>
          </nav>
        </div>
      </motion.header>
    </>
  );
}

function NavLink({
  href,
  active,
  children,
}: {
  href: Route;
  active: boolean;
  children: ReactNode;
}) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "group inline-flex min-h-11 items-center px-2 transition-colors",
        active ? "text-accent" : "text-ink hover:text-accent",
      )}
    >
      <BracketLabel>{children}</BracketLabel>
    </Link>
  );
}
