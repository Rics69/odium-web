import { platformLabel, platformsOf } from "@/lib/games";
import type { Game } from "@/lib/server/games";

// schema.org VideoGame for search engines (spec, section 10). The texts come
// from the admin; escaping «<» keeps them from closing the script tag.
export function GameJsonLd({ game, siteUrl }: { game: Game; siteUrl: string }) {
  const url = new URL(`/games/${game.slug}`, siteUrl).toString();
  const data = {
    "@context": "https://schema.org",
    "@type": "VideoGame",
    name: game.title,
    description: game.tagline || undefined,
    url,
    image: game.coverUrl
      ? new URL(game.coverUrl, siteUrl).toString()
      : undefined,
    genre: game.genre || undefined,
    gamePlatform: platformsOf(game.platforms).map(platformLabel),
    applicationCategory: "Game",
    datePublished: game.releaseDate ?? undefined,
    author: { "@type": "Organization", name: "Odium", url: siteUrl },
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(data).replace(/</g, "\\u003c"),
      }}
    />
  );
}
