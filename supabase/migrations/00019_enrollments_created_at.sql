-- Add created_at to enrollments so we can order/filter by application date.
ALTER TABLE enrollments ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();
-- Backfill: use enrolled_at for approved enrollments (approval date ≈ application date)
UPDATE enrollments SET created_at = enrolled_at WHERE enrolled_at IS NOT NULL;
