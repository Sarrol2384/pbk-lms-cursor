-- Store individual payment recordings (amount + date) for display as payment history.
CREATE TABLE IF NOT EXISTS payment_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_id UUID NOT NULL REFERENCES payments(id) ON DELETE CASCADE,
  amount INTEGER NOT NULL,
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  recorded_by UUID REFERENCES auth.users(id)
);

CREATE INDEX IF NOT EXISTS idx_payment_transactions_payment_id ON payment_transactions(payment_id);

COMMENT ON TABLE payment_transactions IS 'Individual payment recordings when admin records amount received. Used for payment history with dates.';

-- RLS: students can read their own (via payment->user_id), admins can do all.
ALTER TABLE payment_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Students can read own payment transactions"
  ON payment_transactions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM payments p
      WHERE p.id = payment_transactions.payment_id
      AND p.user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can manage payment transactions"
  ON payment_transactions FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles pr
      WHERE pr.id = auth.uid()
      AND pr.role IN ('super_admin', 'admin')
    )
  );

-- Backfill: create one transaction per payment where amount_paid > 0 (using payment created_at as approximate date).
INSERT INTO payment_transactions (payment_id, amount, recorded_at)
SELECT id, amount_paid, COALESCE(created_at, NOW())
FROM payments
WHERE amount_paid > 0
AND NOT EXISTS (SELECT 1 FROM payment_transactions pt WHERE pt.payment_id = payments.id);
