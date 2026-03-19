-- Ensure payments has columns needed for payment plan (complete-payment and for-enrollment APIs).
ALTER TABLE payments ADD COLUMN IF NOT EXISTS total_installments INTEGER NOT NULL DEFAULT 1;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS installment_months INTEGER NOT NULL DEFAULT 1;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS installment_amount INTEGER NOT NULL DEFAULT 0;

-- Backfill enrollment_id for payments that have user_id + course_id but missing enrollment_id.
UPDATE payments p
SET enrollment_id = e.id
FROM enrollments e
WHERE e.user_id = p.user_id AND e.course_id = p.course_id
  AND p.enrollment_id IS NULL;
