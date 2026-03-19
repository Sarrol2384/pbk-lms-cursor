-- Allow new enrollment statuses: payment_pending (after admin approves application), on_hold (course suspended until admin allows).
UPDATE enrollments SET status = 'pending_approval' WHERE status = 'pending';
ALTER TABLE enrollments DROP CONSTRAINT IF EXISTS enrollments_status_check;
ALTER TABLE enrollments ADD CONSTRAINT enrollments_status_check
  CHECK (status IN ('pending_approval', 'payment_pending', 'approved', 'rejected', 'on_hold'));
