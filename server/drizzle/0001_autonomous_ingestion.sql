CREATE TABLE IF NOT EXISTS "ingest_jobs" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"domain" text NOT NULL,
	"params" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"schedule" text,
	"enabled" boolean DEFAULT true NOT NULL,
	"created_by" text REFERENCES "user"("id"),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "ingest_runs" (
	"id" text PRIMARY KEY NOT NULL,
	"job_id" text REFERENCES "ingest_jobs"("id") ON DELETE set null,
	"trigger" text NOT NULL,
	"status" text DEFAULT 'queued' NOT NULL,
	"stats" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"error" text,
	"triggered_by" text REFERENCES "user"("id"),
	"started_at" timestamp,
	"finished_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "species_candidates" (
	"id" text PRIMARY KEY NOT NULL,
	"run_id" text REFERENCES "ingest_runs"("id") ON DELETE set null,
	"slug" text NOT NULL,
	"record" jsonb NOT NULL,
	"raw_sources" jsonb,
	"synthesis" jsonb,
	"validation" jsonb,
	"confidence" numeric,
	"diff" jsonb,
	"review_state" text DEFAULT 'pending' NOT NULL,
	"reviewed_by" text REFERENCES "user"("id"),
	"reviewed_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "audit_log" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"ts" timestamp DEFAULT now() NOT NULL,
	"actor" text NOT NULL,
	"action" text NOT NULL,
	"entity" text,
	"entity_id" text,
	"run_id" text,
	"before" jsonb,
	"after" jsonb,
	"meta" jsonb DEFAULT '{}'::jsonb
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "usage_meter" (
	"day" date NOT NULL,
	"provider" text NOT NULL,
	"calls" integer DEFAULT 0 NOT NULL,
	"tokens" integer DEFAULT 0 NOT NULL,
	"cost_cents" numeric DEFAULT '0' NOT NULL,
	CONSTRAINT "usage_meter_day_provider_pk" PRIMARY KEY("day","provider")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "source_cache" (
	"key" text PRIMARY KEY NOT NULL,
	"provider" text NOT NULL,
	"payload" jsonb NOT NULL,
	"fetched_at" timestamp DEFAULT now() NOT NULL,
	"ttl_seconds" integer DEFAULT 86400 NOT NULL
);
--> statement-breakpoint
ALTER TABLE "media" ADD COLUMN IF NOT EXISTS "license" text;
--> statement-breakpoint
ALTER TABLE "media" ADD COLUMN IF NOT EXISTS "attribution" text;
--> statement-breakpoint
ALTER TABLE "media" ADD COLUMN IF NOT EXISTS "source_url" text;
--> statement-breakpoint
ALTER TABLE "media" ADD COLUMN IF NOT EXISTS "generated_by" text;
--> statement-breakpoint
ALTER TABLE "species" ADD COLUMN IF NOT EXISTS "origin" text DEFAULT 'curated';
--> statement-breakpoint
ALTER TABLE "species" ADD COLUMN IF NOT EXISTS "provenance" jsonb;
--> statement-breakpoint
ALTER TABLE "species" ADD COLUMN IF NOT EXISTS "confidence" numeric;
--> statement-breakpoint
ALTER TABLE "species" ADD COLUMN IF NOT EXISTS "last_synced_at" timestamp;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "ingest_runs_job_idx" ON "ingest_runs" ("job_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "ingest_runs_created_idx" ON "ingest_runs" ("created_at");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "species_candidates_run_idx" ON "species_candidates" ("run_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "species_candidates_state_idx" ON "species_candidates" ("review_state");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "audit_log_ts_idx" ON "audit_log" ("ts");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "audit_log_entity_idx" ON "audit_log" ("entity","entity_id");
