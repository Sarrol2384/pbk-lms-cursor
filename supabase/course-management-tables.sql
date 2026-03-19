-- Run this in Supabase SQL Editor to add quiz questions, assignment rubrics, and assignment brief support.

-- 1. Add optional brief column to assessments (for assignment instructions)
ALTER TABLE assessments ADD COLUMN IF NOT EXISTS brief TEXT;

-- Ensure units has resources (JSONB) for file uploads
ALTER TABLE units ADD COLUMN IF NOT EXISTS resources JSONB DEFAULT '[]';

-- 2. Quiz questions (for formative_quiz, module_test, final_exam)
CREATE TABLE IF NOT EXISTS quiz_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assessment_id UUID NOT NULL REFERENCES assessments(id) ON DELETE CASCADE,
  question TEXT NOT NULL,
  option_a TEXT NOT NULL DEFAULT '',
  option_b TEXT NOT NULL DEFAULT '',
  option_c TEXT NOT NULL DEFAULT '',
  option_d TEXT NOT NULL DEFAULT '',
  correct_answer TEXT NOT NULL CHECK (correct_answer IN ('A', 'B', 'C', 'D')),
  marks INTEGER NOT NULL DEFAULT 10,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_quiz_questions_assessment ON quiz_questions(assessment_id);

ALTER TABLE quiz_questions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "quiz_questions_admin" ON quiz_questions FOR ALL USING (
  auth.uid() IN (SELECT id FROM profiles WHERE role IN ('super_admin', 'admin', 'lecturer'))
);

-- 3. Assignment rubrics (criteria + marks per row)
CREATE TABLE IF NOT EXISTS assignment_rubrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assessment_id UUID NOT NULL REFERENCES assessments(id) ON DELETE CASCADE,
  criteria TEXT NOT NULL,
  marks INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_assignment_rubrics_assessment ON assignment_rubrics(assessment_id);

ALTER TABLE assignment_rubrics ENABLE ROW LEVEL SECURITY;
CREATE POLICY "assignment_rubrics_admin" ON assignment_rubrics FOR ALL USING (
  auth.uid() IN (SELECT id FROM profiles WHERE role IN ('super_admin', 'admin', 'lecturer'))
);
