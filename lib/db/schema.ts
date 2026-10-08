import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  date,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
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

// Accounts (Better Auth, step 2.2). Better Auth reads and writes these tables
// through its Drizzle adapter by the keys below, so their names and fields
// follow lib/server/auth.ts. Its `name` field is stored as `nickname`.

export const user = pgTable(
  "user",
  {
    id: uuid().primaryKey().defaultRandom(),
    nickname: text().notNull(),
    email: text().notNull().unique(),
    emailVerified: boolean().notNull().default(false),
    image: text(),
    // Admin plugin: "user" or "admin", and bans.
    role: text().notNull().default("user"),
    banned: boolean().notNull().default(false),
    banReason: text(),
    banExpires: timestamp({ withTimezone: true }),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    updatedAt: updatedAt(),
  },
  (table) => [
    // Nicknames are unique whatever the case: Odium and odium are one nick.
    uniqueIndex("user_nickname_lower_key").on(sql`lower(${table.nickname})`),
  ],
);

export const session = pgTable(
  "session",
  {
    id: uuid().primaryKey().defaultRandom(),
    token: text().notNull().unique(),
    userId: uuid()
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    expiresAt: timestamp({ withTimezone: true }).notNull(),
    ipAddress: text(),
    userAgent: text(),
    impersonatedBy: uuid(),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    updatedAt: updatedAt(),
  },
  (table) => [index("session_user_id_idx").on(table.userId)],
);

// Sign-in methods of a user; the password hash lives here.
export const account = pgTable(
  "account",
  {
    id: uuid().primaryKey().defaultRandom(),
    accountId: text().notNull(),
    providerId: text().notNull(),
    userId: uuid()
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    accessToken: text(),
    refreshToken: text(),
    idToken: text(),
    accessTokenExpiresAt: timestamp({ withTimezone: true }),
    refreshTokenExpiresAt: timestamp({ withTimezone: true }),
    scope: text(),
    password: text(),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    updatedAt: updatedAt(),
  },
  (table) => [index("account_user_id_idx").on(table.userId)],
);

// One-time tokens: email confirmation, password reset.
export const verification = pgTable(
  "verification",
  {
    id: uuid().primaryKey().defaultRandom(),
    identifier: text().notNull(),
    value: text().notNull(),
    expiresAt: timestamp({ withTimezone: true }).notNull(),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    updatedAt: updatedAt(),
  },
  (table) => [index("verification_identifier_idx").on(table.identifier)],
);

// Disposable mail services: signing up with them is refused (spec, section 7).
// A domain also blocks its subdomains. Edited in the admin (step 4.6).
export const blockedEmailDomains = pgTable("blocked_email_domains", {
  domain: text().primaryKey(),
});
