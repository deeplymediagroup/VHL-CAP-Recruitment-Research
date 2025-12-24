-- VHL Recruitment Tracker Database Schema
-- Run this in Supabase SQL Editor

-- Create enum for run types
CREATE TYPE "RunType" AS ENUM ('RSS_POLL', 'BACKFILL', 'LIGHT_CRAWL');

-- Create recruits table
CREATE TABLE IF NOT EXISTS "recruits" (
    "id" TEXT NOT NULL PRIMARY KEY DEFAULT gen_random_uuid()::text,
    "topic_id" INTEGER NOT NULL UNIQUE,
    "topic_url" TEXT NOT NULL,
    "topic_title" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ,
    "season_number" INTEGER,
    "username" TEXT,
    "player_name" TEXT,
    "recruited_from" TEXT,
    "position" TEXT,
    "age" INTEGER,
    "height_in" INTEGER,
    "weight_lbs" INTEGER,
    "birthplace" TEXT,
    "raw_text_snapshot" TEXT,
    "ingested_at" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes for recruits
CREATE INDEX IF NOT EXISTS "recruits_season_number_idx" ON "recruits"("season_number");
CREATE INDEX IF NOT EXISTS "recruits_username_idx" ON "recruits"("username");
CREATE INDEX IF NOT EXISTS "recruits_player_name_idx" ON "recruits"("player_name");
CREATE INDEX IF NOT EXISTS "recruits_recruited_from_idx" ON "recruits"("recruited_from");

-- Create seasons table
CREATE TABLE IF NOT EXISTS "seasons" (
    "id" TEXT NOT NULL PRIMARY KEY DEFAULT gen_random_uuid()::text,
    "season_number" INTEGER NOT NULL UNIQUE,
    "start_date" DATE NOT NULL,
    "end_date" DATE,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create ingestion_runs table
CREATE TABLE IF NOT EXISTS "ingestion_runs" (
    "id" TEXT NOT NULL PRIMARY KEY DEFAULT gen_random_uuid()::text,
    "run_type" "RunType" NOT NULL,
    "started_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "finished_at" TIMESTAMPTZ,
    "items_found" INTEGER NOT NULL DEFAULT 0,
    "topics_ingested" INTEGER NOT NULL DEFAULT 0,
    "topics_failed" INTEGER NOT NULL DEFAULT 0,
    "errors_json" JSONB
);

-- Create checkpoints table
CREATE TABLE IF NOT EXISTS "checkpoints" (
    "key" TEXT NOT NULL PRIMARY KEY,
    "value" TEXT NOT NULL,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Insert initial seasons
INSERT INTO "seasons" ("season_number", "start_date") VALUES
    (101, '2025-06-16'),
    (102, '2025-08-26'),
    (103, '2025-11-03')
ON CONFLICT ("season_number") DO NOTHING;

-- Insert initial checkpoints
INSERT INTO "checkpoints" ("key", "value") VALUES
    ('rss:last_pubdate', ''),
    ('rss:last_seen_topic_id', '0'),
    ('backfill:last_page_scanned', '0'),
    ('backfill:last_topic_id_scanned', '0')
ON CONFLICT ("key") DO NOTHING;

-- Create trigger to auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_seasons_updated_at BEFORE UPDATE ON "seasons"
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_checkpoints_updated_at BEFORE UPDATE ON "checkpoints"
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
