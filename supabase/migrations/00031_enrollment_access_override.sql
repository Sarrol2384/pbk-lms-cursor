-- Additive audit columns for a deliberate admin override of the first-instalment rule.
-- Do not run this against production from the app. Paste it in the Supabase SQL editor
-- after reviewing it. It does not change existing enrolment statuses, payment amounts,
-- or course fees. Existing rows get access_override = false.
--
-- Scheduled instalments are NOT changed here, and they do not need to be.
-- There is no instalment schedule table and no job that creates future instalment rows.
-- A plan is payments.total_installments plus payments.installment_amount on the
-- existing payment row. Money received is payments.amount_paid, accumulated from
-- payment_transactions. The first-instalment gate is computed from those columns.
-- Turning on a scheduler, or adding schedule rows, would duplicate that ledger.
--
-- Currency: the integers already stored are now read as US dollars. This file does
-- not convert, multiply, or rewrite any fee or amount_paid value.

ALTER TABLE public.enrollments
  ADD COLUMN IF NOT EXISTS access_override boolean NOT NULL DEFAULT false;

ALTER TABLE public.enrollments
  ADD COLUMN IF NOT EXISTS access_override_at timestamptz;

ALTER TABLE public.enrollments
  ADD COLUMN IF NOT EXISTS access_override_by uuid REFERENCES auth.users(id);

ALTER TABLE public.enrollments
  ADD COLUMN IF NOT EXISTS access_override_reason text;

COMMENT ON COLUMN public.enrollments.access_override IS
  'True only when an admin explicitly granted course access before the first instalment was recorded. Audited by access_override_at, access_override_by, and access_override_reason.';

COMMENT ON COLUMN public.payments.amount IS
  'Amount due in USD. The stored number is unchanged from the previous fee figure. No currency conversion.';

COMMENT ON COLUMN public.payments.amount_paid IS
  'Cumulative USD received for this payment, accumulated from payment_transactions. Balance = amount - amount_paid. Historical numbers are not converted.';
