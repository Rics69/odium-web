import type { PlatformLink, Store } from "@/lib/validation/games";

export type Platform = "android" | "ios" | "pc" | "browser";

const platformOfStore: Record<Store, Platform> = {
  google_play: "android",
  rustore: "android",
  appgallery: "android",
  app_store: "ios",
  steam: "pc",
  yandex_games: "browser",
  web: "browser",
};

/** Platforms for a game card, once each, in the order of its store links. */
export function platformsOf(links: PlatformLink[]): Platform[] {
  return [...new Set(links.map((link) => platformOfStore[link.store]))];
}
