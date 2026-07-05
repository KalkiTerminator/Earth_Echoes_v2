CREATE TABLE "account" (
	"id" text PRIMARY KEY NOT NULL,
	"account_id" text NOT NULL,
	"provider_id" text NOT NULL,
	"user_id" text NOT NULL,
	"access_token" text,
	"refresh_token" text,
	"id_token" text,
	"access_token_expires_at" timestamp,
	"refresh_token_expires_at" timestamp,
	"scope" text,
	"password" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "atlas_snapshots" (
	"id" serial PRIMARY KEY NOT NULL,
	"version" integer NOT NULL,
	"doc" jsonb NOT NULL,
	"published_by" text,
	"published_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "daily_rollups" (
	"day" date NOT NULL,
	"metric" text NOT NULL,
	"dims" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"value" numeric NOT NULL,
	CONSTRAINT "daily_rollups_day_metric_dims_pk" PRIMARY KEY("day","metric","dims")
);
--> statement-breakpoint
CREATE TABLE "events" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"ts" timestamp DEFAULT now() NOT NULL,
	"anon_id" uuid NOT NULL,
	"user_id" text,
	"session_key" text,
	"name" text NOT NULL,
	"props" jsonb DEFAULT '{}'::jsonb
);
--> statement-breakpoint
CREATE TABLE "habitats" (
	"id" text PRIMARY KEY NOT NULL,
	"label" text NOT NULL,
	"color" text NOT NULL,
	"rgb" text NOT NULL,
	"atmos" text,
	"sort_order" integer DEFAULT 0,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "media" (
	"id" text PRIMARY KEY NOT NULL,
	"kind" text NOT NULL,
	"original_name" text,
	"mime" text NOT NULL,
	"size_bytes" integer,
	"url" text NOT NULL,
	"created_by" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "quiz_scores" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"total" integer NOT NULL,
	"rounds" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "session" (
	"id" text PRIMARY KEY NOT NULL,
	"expires_at" timestamp NOT NULL,
	"token" text NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"user_id" text NOT NULL,
	"impersonated_by" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "session_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "species" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"scientific" text,
	"status" text,
	"habitat" text NOT NULL,
	"habitat_label" text,
	"lat" double precision NOT NULL,
	"lng" double precision NOT NULL,
	"year_extinct" integer,
	"population" text,
	"threats" jsonb DEFAULT '[]'::jsonb,
	"iconic_action" text,
	"description" text,
	"image_url" text,
	"image_remote" text,
	"youtube" text,
	"threat_class" text,
	"pop_count" integer,
	"help" jsonb,
	"audio_url" text,
	"sort_order" integer DEFAULT 0,
	"published" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "threat_classes" (
	"id" text PRIMARY KEY NOT NULL,
	"label" text NOT NULL,
	"color" text NOT NULL,
	"sort_order" integer DEFAULT 0,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"email_verified" boolean DEFAULT false NOT NULL,
	"image" text,
	"role" text DEFAULT 'user' NOT NULL,
	"banned" boolean DEFAULT false,
	"ban_reason" text,
	"ban_expires" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "user_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "user_state" (
	"user_id" text PRIMARY KEY NOT NULL,
	"bookmarks" jsonb DEFAULT '[]'::jsonb,
	"birth_year" integer,
	"config" jsonb,
	"sound_on" boolean,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "verification" (
	"id" text PRIMARY KEY NOT NULL,
	"identifier" text NOT NULL,
	"value" text NOT NULL,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "account" ADD CONSTRAINT "account_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "atlas_snapshots" ADD CONSTRAINT "atlas_snapshots_published_by_user_id_fk" FOREIGN KEY ("published_by") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "media" ADD CONSTRAINT "media_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quiz_scores" ADD CONSTRAINT "quiz_scores_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session" ADD CONSTRAINT "session_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "species" ADD CONSTRAINT "species_habitat_habitats_id_fk" FOREIGN KEY ("habitat") REFERENCES "public"."habitats"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "species" ADD CONSTRAINT "species_threat_class_threat_classes_id_fk" FOREIGN KEY ("threat_class") REFERENCES "public"."threat_classes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_state" ADD CONSTRAINT "user_state_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "events_ts_idx" ON "events" USING btree ("ts");--> statement-breakpoint
CREATE INDEX "events_name_ts_idx" ON "events" USING btree ("name","ts");--> statement-breakpoint
CREATE INDEX "events_anon_ts_idx" ON "events" USING btree ("anon_id","ts");