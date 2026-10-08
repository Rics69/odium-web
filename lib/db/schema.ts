import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  date,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import type { PlatformLink, Screenshot } from "@/lib/validation/games";
import type { Social, TeamMember } from "@/lib/validation/studio";

// Column names follow the spec (snake_case); `casing` in the Drizzle config
// maps the camelCase keys below to them.

const updatedAt = () =>
  timestamp({ withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date());

export const gameStatus = pgEnum("game_status", ["released", "in_development"]);

export const games = pgTable("games", {
  id: uuid().primaryKey().defaultRandom(),
  slug: text().notNull().unique(),
  title: text().notNull(),
  tagline: text().notNull().default(""),
  descriptionMd: text().notNull().default(""),
  coverUrl: text(),
  screenshots: jsonb().$type<Screenshot[]>().notNull().default([]),
  trailerUrl: text(),
  genre: text().notNull().default(""),
  platforms: jsonb().$type<PlatformLink[]>().notNull().default([]),
  status: gameStatus().notNull().default("in_development"),
  releaseDate: date({ mode: "string" }),
  sortOrder: integer().notNull().default(0),
  wishesOpen: boolean().notNull().default(true),
  published: boolean().notNull().default(false),
  createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  updatedAt: updatedAt(),
});

// Exactly one row (id = 1): the texts and links of the studio.
export const studioInfo = pgTable(
  "studio_info",
  {
    id: integer().primaryKey().default(1),
    tagline: text().notNull().default(""),
    aboutMd: text().notNull().default(""),
    mission: text().notNull().default(""),
    team: jsonb().$type<TeamMember[]>().notNull().default([]),
    socials: jsonb().$type<Social[]>().notNull().default([]),
    contactEmail: text(),
    updatedAt: updatedAt(),
  },
  (table) => [check("studio_info_single_row", sql`${table.id} = 1`)],
);

// Request counters in fixed time windows (spec, section 7): one row per
// limit key and window. Old windows are deleted by a daily job (step 4.8).
export const rateLimits = pgTable(
  "rate_limits",
  {
    key: text().notNull(),
    windowStart: timestamp({ withTimezone: true }).notNull(),
    count: integer().notNull().default(0),
  },
  (table) => [primaryKey({ columns: [table.key, table.windowStart] })],
);
