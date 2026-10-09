import type { Metadata, Route } from "next";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { Board } from "@/components/board/board";
import { Doodle } from "@/components/doodles/doodle";
import { TextLink } from "@/components/ui/text-link";
import { t } from "@/lib/i18n";
import { findBoardGame, listWishes } from "@/lib/server/board";
import { getCurrentUser } from "@/lib/server/session";
import { boardQuerySchema } from "@/lib/validation/wishes";

export async function generateMetadata({
  params,
}: PageProps<"/games/[slug]/wishes">): Promise<Metadata> {
  const game = await findBoardGame((await params).slug);
  if (!game) return {};
  return {
    title: `${t("board.title")} · ${game.title}`,
    description: t("board.description", { game: game.title }),
  };
}

// The first page comes with the HTML: the board is readable without
// JavaScript and indexable. Unknown choices in the address fall back to
// the defaults.
export default async function WishesPage({
  params,
  searchParams,
}: PageProps<"/games/[slug]/wishes">) {
  const game = await findBoardGame((await params).slug);
  if (!game) notFound();

  const raw = await searchParams;
  const parsed = boardQuerySchema.safeParse(
    Object.fromEntries(
      Object.entries(raw).filter(
        ([key, value]) => key !== "cursor" && typeof value === "string",
      ),
    ),
  );
  const query = parsed.success ? parsed.data : boardQuerySchema.parse({});
  const viewer = await getCurrentUser(await headers());
  const initial = await listWishes(game.id, query, viewer?.id ?? null);

  return (
    <section className="mx-auto flex max-w-4xl flex-col gap-8 px-4 py-12 md:px-8 md:py-16">
      <div className="flex flex-col gap-3">
        <TextLink
          href={`/games/${game.slug}` as Route}
          className="w-fit text-sm"
        >
          {game.title}
        </TextLink>
        <h1 className="relative w-fit font-display text-display-sm">
          {t("board.title")}
          <Doodle
            name="sparkle"
            draw="view"
            className="absolute -top-7 right-0 size-8 text-accent md:-top-3 md:-right-8"
          />
        </h1>
        <p className="max-w-2xl text-lg text-ink-2">{t("board.lead")}</p>
      </div>
      <Board
        key={JSON.stringify(query)}
        slug={game.slug}
        query={query}
        initial={initial}
        viewer={{
          signedIn: viewer !== null,
          verified: viewer?.emailVerified ?? false,
        }}
      />
    </section>
  );
}
