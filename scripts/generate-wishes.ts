// npm run db:generate-wishes -- [--game neon-garden] [--count 10000] [--clean]
//
// A heavy board for speed checks (spec: the wish list API answers in under
// 200 ms with 10 000 wishes). Made-up players, wishes and votes; --clean
// removes everything it made. Development only.
import { parseArgs } from "node:util";
import nextEnv from "@next/env";
import { eq, inArray, like, sql } from "drizzle-orm";

nextEnv.loadEnvConfig(process.cwd(), true);

const { values } = parseArgs({
  options: {
    game: { type: "string", default: "neon-garden" },
    count: { type: "string", default: "10000" },
    players: { type: "string", default: "300" },
    clean: { type: "boolean", default: false },
  },
});

const { db, pool } = await import("@/lib/db");
const { games, user, votes, wishes } = await import("@/lib/db/schema");
const { normalizeTitle } = await import("@/lib/wishes");

const EMAIL = (n: number) => `load-${n}@odium.local`;
const loadPlayers = like(user.email, "load-%@odium.local");

async function clean() {
  const ids = db.select({ id: user.id }).from(user).where(loadPlayers);
  await db.delete(wishes).where(inArray(wishes.authorId, ids));
  const removed = await db.delete(user).where(loadPlayers).returning();
  console.log(`Removed ${removed.length} generated players and their wishes.`);
}

if (values.clean) {
  await clean();
  await pool.end();
  process.exit(0);
}

const count = Number(values.count);
const playerCount = Number(values.players);
const [game] = await db
  .select({ id: games.id })
  .from(games)
  .where(eq(games.slug, values.game));
if (!game) {
  console.error(`No game with slug "${values.game}".`);
  process.exit(1);
}

const started = performance.now();
await clean();

const players = await db
  .insert(user)
  .values(
    Array.from({ length: playerCount }, (_, i) => ({
      nickname: `load_${i + 1}`,
      email: EMAIL(i + 1),
      emailVerified: true,
    })),
  )
  .returning({ id: user.id });

const verbs = [
  "Добавить",
  "Сделать",
  "Вернуть",
  "Улучшить",
  "Ускорить",
  "Разрешить",
  "Показывать",
  "Перенести",
  "Починить",
  "Расширить",
];
const things = [
  "новые уровни",
  "кооператив",
  "таблицу рекордов",
  "ежедневные задания",
  "тёмную тему",
  "фоторежим",
  "редактор уровней",
  "питомцев",
  "погоду",
  "достижения",
  "ночной режим",
  "подсказки",
  "сезонные события",
  "облачные сохранения",
  "озвучку",
  "мини-игры",
  "гильдии",
  "крафт",
  "магазин скинов",
  "обучение",
];
const details = [
  "для новичков",
  "на телефоне",
  "в главном меню",
  "после финала",
  "для друзей",
  "без рекламы",
  "в настройках",
  "на выходных",
  "в каждой главе",
  "по желанию",
];
const removals = [
  "Убрать рекламу",
  "Убрать таймер",
  "Убрать донат",
  "Убрать лишние уведомления",
  "Убрать тряску экрана",
  "Убрать обязательный вход",
  "Убрать автосохранение посреди боя",
  "Убрать гринд",
];
const statuses = [
  "new",
  "new",
  "new",
  "new",
  "review",
  "planned",
  "in_progress",
  "done",
  "declined",
] as const;
const pick = <T>(list: readonly T[]) =>
  list[Math.floor(Math.random() * list.length)]!;
const DAY_MS = 24 * 60 * 60 * 1000;

const newWish = () => {
  const remove = Math.random() < 0.25;
  const title = remove
    ? `${pick(removals)} ${pick(details)}`
    : `${pick(verbs)} ${pick(things)} ${pick(details)}`;
  const createdAt = new Date(Date.now() - Math.random() * 180 * DAY_MS);
  const hidden = Math.random() < 0.03;
  return {
    gameId: game.id,
    authorId: pick(players).id,
    type: remove ? ("remove" as const) : ("add" as const),
    title,
    titleNormalized: normalizeTitle(title),
    body: "Сгенерировано для замеров скорости.",
    status: pick(statuses),
    hidden,
    hiddenReason: hidden ? ("spam" as const) : null,
    createdAt,
    updatedAt: createdAt,
  };
};

// One author cannot post the same title twice (the unique index), so a
// clash is skipped and made up for in the next round.
let made: { id: string; createdAt: Date }[] = [];
while (made.length < count) {
  const rows = Array.from(
    { length: Math.min(1000, count - made.length) },
    newWish,
  );
  made = made.concat(
    await db
      .insert(wishes)
      .values(rows)
      .onConflictDoNothing()
      .returning({ id: wishes.id, createdAt: wishes.createdAt }),
  );
}

// Few wishes get many votes and most get a few, as on a real board.
const voteRows = made.flatMap((wish) => {
  const voters = new Set<string>();
  const wanted = Math.floor(
    Math.pow(Math.random(), 4) * Math.min(playerCount, 120),
  );
  while (voters.size < wanted) voters.add(pick(players).id);
  return [...voters].map((userId) => ({
    wishId: wish.id,
    userId,
    createdAt: new Date(
      wish.createdAt.getTime() +
        Math.random() * (Date.now() - wish.createdAt.getTime()),
    ),
  }));
});
for (let i = 0; i < voteRows.length; i += 5000) {
  await db.insert(votes).values(voteRows.slice(i, i + 5000));
}
await db.execute(sql`
  update ${wishes} set votes_count = counted.n
  from (select wish_id, count(*)::int as n from ${votes} group by wish_id) counted
  where counted.wish_id = ${wishes.id}
`);
await db.execute(sql`analyze ${wishes}; analyze ${votes}`);

console.log(
  `Made ${made.length} wishes and ${voteRows.length} votes by ${players.length} players on ${values.game} in ${Math.round(performance.now() - started)} ms.`,
  "Remove them: npm run db:generate-wishes -- --clean",
);
await pool.end();
