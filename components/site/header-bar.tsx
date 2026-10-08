"use client";

import { motion, useMotionValueEvent, useScroll } from "motion/react";
import type { Route } from "next";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { spring } from "@/components/motion/presets";
import { BracketLabel } from "@/components/ui/bracket-label";
import { cn } from "@/lib/cn";
import { t } from "@/lib/i18n";
import { Logo } from "./logo";

const HIDE_AFTER_PX = 160;

export type HeaderUser = { nickname: string };

// Transparent at the top of the page; once scrolled it gets a paper
// background, hides while scrolling down and comes back on the way up.
export function HeaderBar({ user }: { user: HeaderUser | null }) {
  const pathname = usePathname();
  const { scrollY } = useScroll();
  const [scrolled, setScrolled] = useState(false);
  const [hidden, setHidden] = useState(false);

  useMotionValueEvent(scrollY, "change", (y) => {
    const previous = scrollY.getPrevious() ?? 0;
    setScrolled(y > 8);
    setHidden(y > HIDE_AFTER_PX && y > previous);
  });

  // Pages only read the session. This request lets Better Auth extend it
  // and renew the cookie, at most once a day (lib/server/session.ts).
  const signedIn = user !== null;
  useEffect(() => {
    if (signedIn) fetch("/api/auth/get-session").catch(() => {});
  }, [signedIn]);

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
              <li>
                {user ? (
                  <ProfileLink
                    nickname={user.nickname}
                    active={pathname === "/profile"}
                  />
                ) : (
                  <NavLink href="/login" active={pathname === "/login"}>
                    {t("nav.signIn")}
                  </NavLink>
                )}
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

// A round badge with the first letter of the nickname; on a phone the
// nickname itself is left to screen readers.
function ProfileLink({
  nickname,
  active,
}: {
  nickname: string;
  active: boolean;
}) {
  return (
    <Link
      href="/profile"
      aria-current={active ? "page" : undefined}
      className={cn(
        "group inline-flex min-h-11 items-center gap-2 px-2 transition-colors",
        active ? "text-accent" : "text-ink hover:text-accent",
      )}
    >
      <span
        aria-hidden
        className="grid size-8 place-items-center rounded-full bg-accent font-display text-sm text-white transition-[rotate,scale] duration-300 ease-[var(--ease-bounce)] group-hover:scale-110 group-hover:-rotate-12"
      >
        {nickname.charAt(0).toUpperCase()}
      </span>
      <span className="sr-only text-sm font-medium md:not-sr-only md:max-w-40 md:truncate">
        {nickname}
      </span>
    </Link>
  );
}
