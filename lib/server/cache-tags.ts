// Tags of cached reads (spec, section 9). A change revalidates its tag.
export const cacheTags = {
  games: "games",
  game: (slug: string) => `game:${slug}`,
  studio: "studio",
  wishes: (gameId: string) => `wishes:${gameId}`,
} as const;
