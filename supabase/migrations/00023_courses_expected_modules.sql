-- Per-course expected module count (18 for SAQA 118402 BBA, 20 for other qualifications)
ALTER TABLE courses ADD COLUMN IF NOT EXISTS expected_modules INTEGER DEFAULT 20;
COMMENT ON COLUMN courses.expected_modules IS 'Target module count for this qualification (e.g. 18 for SAQA 118402, 20 for SETA-aligned full qualification).';
