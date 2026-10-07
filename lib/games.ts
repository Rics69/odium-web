import { t, type MessageKey } from "@/lib/i18n";
import type { GameStatus, PlatformLink, Store } from "@/lib/validation/games";

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

const platformText = {
  android: "platforms.android",
  ios: "platforms.ios",
  pc: "platforms.pc",
  browser: "platforms.browser",
} as const satisfies Record<Platform, MessageKey>;

const statusText = {
  released: "gameStatus.released",
  in_development: "gameStatus.in_development",
} as const satisfies Record<GameStatus, MessageKey>;

/** «Android», «ПК»… */
export function platformLabel(platform: Platform) {
  return t(platformText[platform]);
}

/** «Вышла» / «В разработке». */
export function statusLabel(status: GameStatus) {
  return t(statusText[status]);
}
