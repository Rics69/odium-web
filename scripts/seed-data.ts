// Development and e2e test content. «Деревня Слов» is the studio's real game;
// «Неоновый сад» and «Секретный проект» are invented and get replaced with
// real games in the admin (checkpoint 4). The team shows roles only and the
// contact email stays off the site (the user's decision, 07.10.2026).
import { inArray } from "drizzle-orm";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import { z } from "zod";
import { games, studioInfo, user, votes, wishes } from "@/lib/db/schema";
import {
  platformLinkSchema,
  screenshotSchema,
  slugSchema,
} from "@/lib/validation/games";
import { socialSchema, teamMemberSchema } from "@/lib/validation/studio";
import { normalizeTitle } from "@/lib/wishes";

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
      "Тестовая игра для разработки сайта. Сажай семена, поливай ростки и собирай букеты, которые светятся в темноте.\n\nВместо трейлера — мультфильм «Big Buck Bunny» (Blender Foundation, CC BY 3.0).",
    trailerUrl: "https://www.youtube.com/watch?v=aqz-KE-bpKQ",
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
// Players who wrote and voted for the test wishes. They have no password:
// nobody signs in as them.
export const testPlayers = [
  "Буквоед",
  "Pixel_Hunter",
  "Садовница",
  "night_owl",
  "Словарик",
].map((nickname, index) => ({
  nickname,
  email: `seed-player-${index + 1}@odium.local`,
  emailVerified: true,
}));

type TestWish = {
  game: string;
  type: "add" | "remove";
  title: string;
  body?: string;
  status?: "new" | "review" | "planned" | "in_progress" | "done" | "declined";
  studioReply?: string;
  doneVersion?: string;
  hiddenReason?: "spam" | "flagged";
  /** Index in testPlayers; null for an author who deleted the account. */
  author: number | null;
  /** Indexes in testPlayers; the author votes for their own wish. */
  voters: number[];
  daysAgo: number;
};

// Every type and status, hidden ones, studio replies, a deleted author.
export const testWishes: TestWish[] = [
  {
    game: "derevnya-slov",
    type: "add",
    title: "Режим на время",
    body: "Хочу соревноваться с друзьями: кто соберёт больше слов за минуту.\nМожно с таблицей рекордов недели.",
    status: "planned",
    studioReply: "Звучит отлично — берём в планы на осень!",
    author: 0,
    voters: [0, 1, 2, 3, 4],
    daysAgo: 20,
  },
  {
    game: "derevnya-slov",
    type: "add",
    title: "Подсказка по первой букве",
    body: "Иногда слово вертится на языке — одной буквы хватило бы.",
    status: "in_progress",
    author: 2,
    voters: [2, 0, 4],
    daysAgo: 14,
  },
  {
    game: "derevnya-slov",
    type: "remove",
    title: "Таймер на уровнях",
    body: "Таймер мешает думать, хочется играть спокойно.",
    status: "review",
    author: 3,
    voters: [3, 1],
    daysAgo: 9,
  },
  {
    game: "derevnya-slov",
    type: "add",
    title: "Тёмная тема",
    body: "Играю перед сном, глаза устают от белого.",
    author: 1,
    voters: [1],
    daysAgo: 2,
  },
  {
    game: "derevnya-slov",
    type: "add",
    title: "Ежедневное задание",
    body: "Одно особое слово в день, чтобы был повод заходить.",
    status: "done",
    doneVersion: "1.2.0",
    studioReply: "Добавили в версии 1.2 — заходите каждый день!",
    author: 4,
    voters: [4, 0, 1, 2],
    daysAgo: 40,
  },
  {
    game: "derevnya-slov",
    type: "remove",
    title: "Реклама после каждого уровня",
    status: "declined",
    studioReply:
      "Совсем без рекламы игра не окупится, но мы показываем её вдвое реже.",
    author: 3,
    voters: [3, 2, 4],
    daysAgo: 30,
  },
  {
    game: "derevnya-slov",
    type: "add",
    title: "Купить монеты дёшево по ссылке",
    body: "Пишите в личку, отдам недорого.",
    hiddenReason: "spam",
    author: 1,
    voters: [1],
    daysAgo: 5,
  },
  {
    game: "derevnya-slov",
    type: "add",
    title: "Уровни слишком тупые",
    body: "Хочется слов посложнее.",
    hiddenReason: "flagged",
    author: 0,
    voters: [0],
    daysAgo: 1,
  },
  {
    game: "derevnya-slov",
    type: "add",
    title: "Таблица рекордов",
    body: "Чтобы видеть, кто лучший в деревне.",
    author: null,
    voters: [2, 4],
    daysAgo: 12,
  },
  {
    game: "neon-garden",
    type: "add",
    title: "Больше видов цветов",
    body: "Особенно тех, что светятся разными цветами.",
    status: "planned",
    author: 2,
    voters: [2, 0, 1, 3],
    daysAgo: 3,
  },
  {
    game: "neon-garden",
    type: "remove",
    title: "Звук поливки",
    body: "Слишком громкий, особенно в наушниках.",
    author: 3,
    voters: [3],
    daysAgo: 6,
  },
  {
    game: "neon-garden",
    type: "add",
    title: "Сад на рабочем столе",
    status: "review",
    author: 4,
    voters: [4, 2],
    daysAgo: 18,
  },
];

const DAY_MS = 24 * 60 * 60 * 1000;

type Db = Pick<NodePgDatabase, "insert" | "select" | "delete">;

export async function seedDatabase(db: Db) {
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

  await seedBoard(db);
}

/**
 * The test boards from scratch: the wishes of the test games are replaced,
 * and the counters match the votes.
 */
async function seedBoard(db: Db) {
  const gameRows = await db
    .select({ id: games.id, slug: games.slug })
    .from(games)
    .where(inArray(games.slug, [...new Set(testWishes.map((w) => w.game))]));
  const gameIds = new Map(gameRows.map((row) => [row.slug, row.id]));
  await db.delete(wishes).where(inArray(wishes.gameId, [...gameIds.values()]));

  await db.insert(user).values(testPlayers).onConflictDoNothing();
  const playerRows = await db
    .select({ id: user.id, email: user.email })
    .from(user)
    .where(
      inArray(
        user.email,
        testPlayers.map((player) => player.email),
      ),
    );
  const playerIds = testPlayers.map(
    (player) => playerRows.find((row) => row.email === player.email)!.id,
  );

  const now = Date.now();
  for (const wish of testWishes) {
    const createdAt = new Date(now - wish.daysAgo * DAY_MS);
    const [row] = await db
      .insert(wishes)
      .values({
        gameId: gameIds.get(wish.game)!,
        authorId: wish.author === null ? null : playerIds[wish.author]!,
        type: wish.type,
        title: wish.title,
        titleNormalized: normalizeTitle(wish.title),
        body: wish.body ?? "",
        status: wish.status ?? "new",
        studioReply: wish.studioReply ?? null,
        doneVersion: wish.doneVersion ?? null,
        hidden: Boolean(wish.hiddenReason),
        hiddenReason: wish.hiddenReason ?? null,
        votesCount: wish.voters.length,
        createdAt,
        updatedAt: createdAt,
      })
      .returning({ id: wishes.id });
    if (wish.voters.length > 0) {
      await db.insert(votes).values(
        wish.voters.map((voter, index) => ({
          wishId: row!.id,
          userId: playerIds[voter]!,
          // One vote every few hours after the wish appeared.
          createdAt: new Date(createdAt.getTime() + index * 5 * 60 * 60 * 1000),
        })),
      );
    }
  }
}
