CREATE TYPE "public"."wish_hidden_reason" AS ENUM('spam', 'abuse', 'off_topic', 'duplicate', 'other', 'flagged');--> statement-breakpoint
CREATE TYPE "public"."wish_status" AS ENUM('new', 'review', 'planned', 'in_progress', 'done', 'declined');--> statement-breakpoint
CREATE TYPE "public"."wish_type" AS ENUM('add', 'remove');--> statement-breakpoint
CREATE TABLE "stop_words" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"word" text NOT NULL,
	CONSTRAINT "stop_words_word_unique" UNIQUE("word")
);
--> statement-breakpoint
CREATE TABLE "votes" (
	"wish_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "votes_wish_id_user_id_pk" PRIMARY KEY("wish_id","user_id")
);
--> statement-breakpoint
CREATE TABLE "wishes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"game_id" uuid NOT NULL,
	"author_id" uuid,
	"type" "wish_type" NOT NULL,
	"title" text NOT NULL,
	"title_normalized" text NOT NULL,
	"body" text DEFAULT '' NOT NULL,
	"status" "wish_status" DEFAULT 'new' NOT NULL,
	"studio_reply" text,
	"done_version" text,
	"votes_count" integer DEFAULT 0 NOT NULL,
	"hidden" boolean DEFAULT false NOT NULL,
	"hidden_reason" "wish_hidden_reason",
	"merged_into_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "wishes_votes_count_non_negative" CHECK ("wishes"."votes_count" >= 0)
);
--> statement-breakpoint
ALTER TABLE "votes" ADD CONSTRAINT "votes_wish_id_wishes_id_fk" FOREIGN KEY ("wish_id") REFERENCES "public"."wishes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "votes" ADD CONSTRAINT "votes_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wishes" ADD CONSTRAINT "wishes_game_id_games_id_fk" FOREIGN KEY ("game_id") REFERENCES "public"."games"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wishes" ADD CONSTRAINT "wishes_author_id_user_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wishes" ADD CONSTRAINT "wishes_merged_into_id_wishes_id_fk" FOREIGN KEY ("merged_into_id") REFERENCES "public"."wishes"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "votes_user_idx" ON "votes" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "votes_wish_created_idx" ON "votes" USING btree ("wish_id","created_at");--> statement-breakpoint
CREATE INDEX "wishes_board_top_idx" ON "wishes" USING btree ("game_id","hidden","votes_count" DESC NULLS FIRST,"created_at" DESC NULLS FIRST);--> statement-breakpoint
CREATE INDEX "wishes_board_new_idx" ON "wishes" USING btree ("game_id","hidden","created_at" DESC NULLS FIRST);--> statement-breakpoint
CREATE INDEX "wishes_title_trgm_idx" ON "wishes" USING gin ("title" gin_trgm_ops);--> statement-breakpoint
CREATE INDEX "wishes_author_idx" ON "wishes" USING btree ("author_id");--> statement-breakpoint
CREATE UNIQUE INDEX "wishes_author_game_title_key" ON "wishes" USING btree ("author_id","game_id","title_normalized") WHERE "wishes"."deleted_at" is null;