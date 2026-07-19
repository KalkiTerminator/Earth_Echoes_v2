-- Audio source attribution shown to the reader (real recording vs AI-generated).
-- Idempotent so it is safe to (re-)apply at boot.
ALTER TABLE "species" ADD COLUMN IF NOT EXISTS "audio_credit" text;
