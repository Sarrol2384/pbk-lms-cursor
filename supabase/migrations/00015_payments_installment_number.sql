-- Support multiple payment rows per enrollment (one per installment).
-- installment_number: 1-based index (1 of 3, 2 of 3, 3 of 3).
ALTER TABLE payments ADD COLUMN IF NOT EXISTS installment_number INTEGER NOT NULL DEFAULT 1;
COMMENT ON COLUMN payments.installment_number IS '1-based installment index when total_installments > 1 (e.g. 1 of 3).';
