// Development and e2e test content. «Деревня Слов» is the studio's real game;
// «Неоновый сад» and «Секретный проект» are invented and get replaced with
// real games in the admin (checkpoint 4). The team shows roles only and the
// contact email stays off the site (the user's decision, 07.10.2026).
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import { z } from "zod";
import { games, studioInfo } from "@/lib/db/schema";
import {
  platformLinkSchema,
  screenshotSchema,
  slugSchema,
} from "@/lib/validation/games";
import { socialSchema, teamMemberSchema } from "@/lib/validation/studio";

const screenshot = (file: string, alt: string) => ({
  url: `/placeholders/${file}.webp`,
  width: 720,
  height: 1280,
  alt,
});

export const testGames: (typeof games.$inferInsert)[] = [
  {
    slug: "derevnya-slov",
    title: "Деревня Слов",
    tagline: "Собирай слова — отстраивай деревню",
    genre: "Словесная головоломка",
    status: "in_development",
    descriptionMd: [
      "Уютная головоломка про слова и деревню, которая растёт вместе с тобой.",
      "",
      "Три режима сменяют друг друга:",
      "",
      "- **Поиск слов** — найди спрятанные слова в сетке букв;",
      "- **Круг букв** — собери слова из букв на круге и заполни кроссворд;",
      "- **Угадай слово** — пять попыток, чтобы отгадать загаданное слово.",
      "",
      "За пройденные уровни получаешь кирпичи и отстраиваешь деревню: дома, мельницу, колодец и всё, что вокруг.",
    ].join("\n"),
    coverUrl: "/placeholders/derevnya-slov-cover.webp",
    screenshots: [
      screenshot("derevnya-slov-1", "Поиск слов: найденное слово подсвечено"),
      screenshot("derevnya-slov-2", "Сетка букв на уровне"),
      screenshot("derevnya-slov-3", "Ещё один уровень с сеткой букв"),
    ],
    platforms: [{ store: "google_play", url: null }],
    sortOrder: 1,
    published: true,
  },
  {
    slug: "neon-garden",
    title: "Неоновый сад",
    tagline: "Выращивай светящиеся цветы в ночном саду",
    genre: "Казуальная",
    status: "released",
    releaseDate: "2026-06-15",
    descriptionMd:
      "Тестовая игра для разработки сайта. Сажай семена, поливай ростки и собирай букеты, которые светятся в темноте.",
    coverUrl: "/placeholders/neon-garden-cover.webp",
    screenshots: [
      screenshot("neon-garden-1", "Грядки неонового сада"),
      screenshot("neon-garden-2", "Сад ночью"),
    ],
    platforms: [
      { store: "google_play", url: null },
      { store: "rustore", url: null },
    ],
    sortOrder: 2,
    published: true,
  },
  {
    slug: "secret-project",
    title: "Секретный проект",
    tagline: "Пока тсс",
    genre: "Приключение",
    status: "in_development",
    descriptionMd: "Тестовая игра, снятая с публикации: на сайте её не видно.",
    coverUrl: "/placeholders/secret-project-cover.webp",
    sortOrder: 3,
    published: false,
  },
];

export const testStudio = {
  id: 1,
  tagline: "Делаем игры. Копим на игру мечты.",
  aboutMd:
    "Odium — маленькая инди-студия: основатель, разработчик и дизайнер. Делаем мобильные игры, в которые приятно возвращаться каждый день.",
  mission:
    "Каждая наша игра — шаг к мечте: создать игру, поставленную как кино, — с режиссурой, светом и историей, от которой невозможно оторваться.",
  team: [
    { name: "", role: "Основатель", photoUrl: null },
    { name: "", role: "Разработчик", photoUrl: null },
    { name: "", role: "Дизайнер", photoUrl: null },
  ],
  socials: [
    { label: "Telegram", url: "https://t.me/odium_games" },
    { label: "Threads", url: "https://www.threads.com/@odium_games" },
    { label: "YouTube", url: "https://www.youtube.com/@odium_games" },
  ],
  contactEmail: null,
};

/** Writes the test content; safe to run again (games match by slug). */
export async function seedDatabase(db: Pick<NodePgDatabase, "insert">) {
  // The same rules as the admin forms will use: a typo fails here, not on the site.
  for (const game of testGames) {
    slugSchema.parse(game.slug);
    z.array(platformLinkSchema).parse(game.platforms ?? []);
    z.array(screenshotSchema).parse(game.screenshots ?? []);
  }
  z.array(teamMemberSchema).parse(testStudio.team);
  z.array(socialSchema).parse(testStudio.socials);

  for (const game of testGames) {
    await db
      .insert(games)
      .values(game)
      .onConflictDoUpdate({ target: games.slug, set: game });
  }
  await db
    .insert(studioInfo)
    .values(testStudio)
    .onConflictDoUpdate({ target: studioInfo.id, set: testStudio });
}
