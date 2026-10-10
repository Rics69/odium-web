import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { Client } from "pg";

/**
 * Name of the database in a connection URL. Throws unless it is a test
 * database, so a wrong URL can never wipe development or production data.
 */
export function testDatabaseName(url: string): string {
  const name = decodeURIComponent(new URL(url).pathname.slice(1));
  if (!name.endsWith("_test")) {
    throw new Error(
      `Refusing to use "${name}": test database names must end with _test`,
    );
  }
  return name;
}

/** Creates the test database on the first run and applies all migrations. */
export async function prepareTestDatabase(url: string): Promise<void> {
  const name = testDatabaseName(url);

  const serverUrl = new URL(url);
  serverUrl.pathname = "/postgres";
  const server = new Client({ connectionString: serverUrl.toString() });
  await server.connect();
  try {
    const { rowCount } = await server.query(
      "select 1 from pg_database where datname = $1",
      [name],
    );
    if (rowCount === 0) {
      await server.query(`create database "${name}"`);
    }
  } finally {
    await server.end();
  }

  const client = new Client({ connectionString: url });
  await client.connect();
  try {
    await migrate(drizzle({ client }), { migrationsFolder: "drizzle" });
  } finally {
    await client.end();
  }
}

/**
 * Empties every table of the test database; the schema and migration
 * history stay. The e2e run starts from this, whatever the unit tests left.
 */
export async function emptyTestDatabase(url: string): Promise<void> {
  testDatabaseName(url);
  const client = new Client({ connectionString: url });
  await client.connect();
  try {
    const { rows } = await client.query<{ tablename: string }>(
      "select tablename from pg_tables where schemaname = 'public'",
    );
    if (rows.length > 0) {
      const tables = rows.map((row) => `"public"."${row.tablename}"`);
      await client.query(
        `truncate table ${tables.join(", ")} restart identity cascade`,
      );
    }
  } finally {
    await client.end();
  }
}
