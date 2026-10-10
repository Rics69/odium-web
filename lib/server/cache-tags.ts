// Tags of cached reads (spec, section 9). A change revalidates its tag.
export const cacheTags = {
  games: "games",
  game: (slug: string) => `game:${slug}`,
  studio: "studio",
  /** The wish counts of the catalogue. */
  wishCounts: "wish-counts",
  /** A game's top wishes on its page. */
  wishes: (gameId: string) => `wishes:${gameId}`,
} as const;
