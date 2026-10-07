CREATE TYPE "public"."game_status" AS ENUM('released', 'in_development');--> statement-breakpoint
CREATE TABLE "games" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"title" text NOT NULL,
	"tagline" text DEFAULT '' NOT NULL,
	"description_md" text DEFAULT '' NOT NULL,
	"cover_url" text,
	"screenshots" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"trailer_url" text,
	"genre" text DEFAULT '' NOT NULL,
	"platforms" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"status" "game_status" DEFAULT 'in_development' NOT NULL,
	"release_date" date,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"wishes_open" boolean DEFAULT true NOT NULL,
	"published" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "games_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "studio_info" (
	"id" integer PRIMARY KEY DEFAULT 1 NOT NULL,
	"tagline" text DEFAULT '' NOT NULL,
	"about_md" text DEFAULT '' NOT NULL,
	"mission" text DEFAULT '' NOT NULL,
	"team" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"socials" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"contact_email" text,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "studio_info_single_row" CHECK ("studio_info"."id" = 1)
);
