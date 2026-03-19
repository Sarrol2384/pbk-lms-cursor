-- Add enrollment_id to payments so we can link proof-of-payment uploads to enrollments.
ALTER TABLE payments ADD COLUMN IF NOT EXISTS enrollment_id UUID REFERENCES enrollments(id);

-- Backfill: link existing payments to the matching enrollment (user_id + course_id).
UPDATE payments p
SET enrollment_id = e.id
FROM enrollments e
WHERE e.user_id = p.user_id AND e.course_id = p.course_id
  AND p.enrollment_id IS NULL;

COMMENT ON COLUMN payments.enrollment_id IS 'Links payment to enrollment for proof-of-payment upload and admin approval flow.';
