-- Add option_a, option_b, option_c, option_d (and related columns) to quiz_questions if missing.
-- Run this in Supabase SQL Editor if you get: Could not find the 'option_a' column of 'quiz_questions'

ALTER TABLE quiz_questions ADD COLUMN IF NOT EXISTS option_a TEXT NOT NULL DEFAULT '';
ALTER TABLE quiz_questions ADD COLUMN IF NOT EXISTS option_b TEXT NOT NULL DEFAULT '';
ALTER TABLE quiz_questions ADD COLUMN IF NOT EXISTS option_c TEXT NOT NULL DEFAULT '';
ALTER TABLE quiz_questions ADD COLUMN IF NOT EXISTS option_d TEXT NOT NULL DEFAULT '';
ALTER TABLE quiz_questions ADD COLUMN IF NOT EXISTS correct_answer TEXT NOT NULL DEFAULT 'A';
ALTER TABLE quiz_questions ADD COLUMN IF NOT EXISTS marks INTEGER NOT NULL DEFAULT 10;
