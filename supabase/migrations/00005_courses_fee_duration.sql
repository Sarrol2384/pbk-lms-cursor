-- Add course fee and payment duration for student applications.
-- Run in Supabase SQL Editor if courses don't have these columns yet.

ALTER TABLE courses ADD COLUMN IF NOT EXISTS fee INTEGER DEFAULT NULL;
ALTER TABLE courses ADD COLUMN IF NOT EXISTS duration_months INTEGER DEFAULT 12;

COMMENT ON COLUMN courses.fee IS 'Total course fee in ZAR (South African Rand). Null = not set, students see "Contact admin".';
COMMENT ON COLUMN courses.duration_months IS 'Max instalment plan in months (e.g. 12 = allow up to 12 monthly payments).';
