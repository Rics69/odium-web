// npm run create-admin -- --email owner@example.com [--nickname Odium]
//
// Makes an admin: creates the account, or promotes an existing player.
// On the server, inside Docker:
//   docker compose run --rm migrate npm run create-admin -- --email …
import { parseArgs } from "node:util";
import nextEnv from "@next/env";
import { ZodError } from "zod";

// @next/env is CommonJS: tsx gives it as a default export only.
nextEnv.loadEnvConfig(process.cwd(), true);

const { values } = parseArgs({
  options: {
    email: { type: "string" },
    nickname: { type: "string" },
  },
});

if (!values.email) {
  console.error(
    "Укажите почту: npm run create-admin -- --email owner@example.com [--nickname Odium]",
  );
  process.exit(1);
}

const { db, pool } = await import("@/lib/db");
const { createAdmin } = await import("./admin");

try {
  const result = await createAdmin(db, {
    email: values.email,
    nickname: values.nickname,
  });
  switch (result.status) {
    case "already-admin":
      console.log(`${result.nickname} уже админ.`);
      break;
    case "promoted":
      console.log(
        `${result.nickname} теперь админ, почта подтверждена. Войдите заново.`,
      );
      break;
    case "created":
      console.log(
        [
          `Админ ${result.nickname} создан, почта подтверждена.`,
          `Пароль (показываем один раз): ${result.password}`,
          "Войдите и смените его в профиле.",
        ].join("\n"),
      );
      break;
  }
} catch (error) {
  console.error(
    error instanceof ZodError
      ? error.issues[0]?.message
      : error instanceof Error
        ? error.message
        : error,
  );
  process.exitCode = 1;
} finally {
  await pool.end();
}
