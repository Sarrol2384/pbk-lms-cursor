-- Cumulative amount paid against this payment (for installments: student can pay any amount; balance is recalculated).
ALTER TABLE payments ADD COLUMN IF NOT EXISTS amount_paid INTEGER NOT NULL DEFAULT 0;
COMMENT ON COLUMN payments.amount_paid IS 'Cumulative ZAR received for this payment. Balance = amount - amount_paid.';
