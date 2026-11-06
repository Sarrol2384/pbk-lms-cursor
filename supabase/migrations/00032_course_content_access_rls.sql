-- Harden direct Supabase reads of course content. Do NOT run this from the app.
-- Paste it manually after 00031_enrollment_access_override.sql, because the student
-- policy reads enrollments.access_override.
--
-- Why this is critical:
-- Student pages check requireActiveEnrollment in Next.js, then read modules, units,
-- and assessments with the signed-in user's Supabase session. The browser also has
-- the anon key. If a SELECT policy allows every authenticated user, a student whose
-- enrolment is still payment_pending can read lesson content with the Data API and
-- skip the app gate. unit_completions and module_progress policies in 00009 let a
-- student insert their own rows for any unit and set a module to passed.
--
-- Safety:
-- This file does not UPDATE, DELETE, or rewrite business rows.
-- It enables RLS (no-op if already on) and replaces broad SELECT/ALL policies.
-- Service-role API routes bypass RLS, so upload, quiz, and progress routes keep working.
-- Admin course editing uses the signed-in staff session, so a staff ALL policy is created.
-- INSERT/UPDATE/DELETE-only policies whose command is not SELECT or ALL are left alone.
-- BEFORE running, save the current policies:
--
--   SELECT c.relname, c.relrowsecurity, pol.polname, pol.polcmd,
--          pg_get_expr(pol.polqual, pol.polrelid) AS using_expr
--   FROM pg_class c
--   JOIN pg_namespace n ON n.oid = c.relnamespace
--   LEFT JOIN pg_policy pol ON pol.polrelid = c.oid
--   WHERE n.nspname = 'public'
--     AND c.relname IN ('modules', 'units', 'assessments', 'unit_completions', 'module_progress')
--   ORDER BY c.relname, pol.polname;
--
-- The DO block drops SELECT and ALL policies on modules, units, and assessments whose
-- USING expression does not mention enrollments or profiles (for example USING (true)
-- or auth.role() = 'authenticated'). It prints each dropped policy with RAISE NOTICE.
-- A custom policy that hides the enrolment check inside a function, and therefore
-- does not contain those words, would also be dropped. Read the notices. If the
-- course editor cannot load afterwards, fix the staff role check below. Do not
-- disable RLS to get the editor back.
--
-- Scheduled instalments are not part of this file.
-- Apply 00031 first.

BEGIN;

ALTER TABLE public.modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.units ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assessments ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.modules FROM PUBLIC, anon;
REVOKE ALL ON TABLE public.units FROM PUBLIC, anon;
REVOKE ALL ON TABLE public.assessments FROM PUBLIC, anon;

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.modules TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.units TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.assessments TO authenticated;

DO $$
DECLARE
  r record;
BEGIN
  FOR r IN
    SELECT c.relname AS table_name,
           pol.polname AS policy_name,
           pol.polcmd AS command,
           pg_get_expr(pol.polqual, pol.polrelid) AS using_expr
    FROM pg_policy pol
    JOIN pg_class c ON c.oid = pol.polrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relname IN ('modules', 'units', 'assessments')
      AND pol.polcmd IN ('r', '*')
  LOOP
    IF r.using_expr IS NULL
       OR btrim(r.using_expr) = 'true'
       OR (
         r.using_expr NOT ILIKE '%enrollments%'
         AND r.using_expr NOT ILIKE '%profiles%'
       )
    THEN
      RAISE NOTICE 'Dropping broad policy % on % (command %): %',
        r.policy_name, r.table_name, r.command, COALESCE(r.using_expr, '(none)');
      EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', r.policy_name, r.table_name);
    ELSE
      RAISE NOTICE 'Keeping policy % on % because it references enrollments or profiles',
        r.policy_name, r.table_name;
    END IF;
  END LOOP;
END $$;

DROP POLICY IF EXISTS "course_content_staff_all" ON public.modules;
CREATE POLICY "course_content_staff_all" ON public.modules
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles pr
      WHERE pr.id = auth.uid()
        AND pr.role IN ('super_admin', 'admin', 'lecturer')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles pr
      WHERE pr.id = auth.uid()
        AND pr.role IN ('super_admin', 'admin', 'lecturer')
    )
  );

DROP POLICY IF EXISTS "course_content_staff_all" ON public.units;
CREATE POLICY "course_content_staff_all" ON public.units
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles pr
      WHERE pr.id = auth.uid()
        AND pr.role IN ('super_admin', 'admin', 'lecturer')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles pr
      WHERE pr.id = auth.uid()
        AND pr.role IN ('super_admin', 'admin', 'lecturer')
    )
  );

DROP POLICY IF EXISTS "course_content_staff_all" ON public.assessments;
CREATE POLICY "course_content_staff_all" ON public.assessments
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles pr
      WHERE pr.id = auth.uid()
        AND pr.role IN ('super_admin', 'admin', 'lecturer')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles pr
      WHERE pr.id = auth.uid()
        AND pr.role IN ('super_admin', 'admin', 'lecturer')
    )
  );

-- Approved enrolment, and either the first instalment or an explicit override.
-- on_hold, payment_pending, pending_approval, and rejected cannot select content.
DROP POLICY IF EXISTS "course_content_approved_student_select" ON public.modules;
CREATE POLICY "course_content_approved_student_select" ON public.modules
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.enrollments e
      WHERE e.course_id = modules.course_id
        AND e.user_id = auth.uid()
        AND e.status = 'approved'
        AND (
          COALESCE(e.access_override, false)
          OR EXISTS (
            SELECT 1
            FROM public.payments p
            WHERE p.enrollment_id = e.id
            GROUP BY p.enrollment_id
            HAVING COALESCE(SUM(p.amount_paid), 0) >= CASE
              WHEN COALESCE(SUM(p.amount), 0) <= 0 THEN 1
              WHEN GREATEST(COALESCE(MAX(p.total_installments), 1), 1) <= 1 THEN COALESCE(SUM(p.amount), 0)
              WHEN COALESCE(MAX(NULLIF(p.installment_amount, 0)), 0) > 0 THEN COALESCE(MAX(NULLIF(p.installment_amount, 0)), 0)
              ELSE CEIL(COALESCE(SUM(p.amount), 0)::numeric / GREATEST(COALESCE(MAX(p.total_installments), 1), 1))
            END
          )
        )
    )
  );

DROP POLICY IF EXISTS "course_content_approved_student_select" ON public.units;
CREATE POLICY "course_content_approved_student_select" ON public.units
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.modules m
      JOIN public.enrollments e ON e.course_id = m.course_id
      WHERE m.id = units.module_id
        AND e.user_id = auth.uid()
        AND e.status = 'approved'
        AND (
          COALESCE(e.access_override, false)
          OR EXISTS (
            SELECT 1
            FROM public.payments p
            WHERE p.enrollment_id = e.id
            GROUP BY p.enrollment_id
            HAVING COALESCE(SUM(p.amount_paid), 0) >= CASE
              WHEN COALESCE(SUM(p.amount), 0) <= 0 THEN 1
              WHEN GREATEST(COALESCE(MAX(p.total_installments), 1), 1) <= 1 THEN COALESCE(SUM(p.amount), 0)
              WHEN COALESCE(MAX(NULLIF(p.installment_amount, 0)), 0) > 0 THEN COALESCE(MAX(NULLIF(p.installment_amount, 0)), 0)
              ELSE CEIL(COALESCE(SUM(p.amount), 0)::numeric / GREATEST(COALESCE(MAX(p.total_installments), 1), 1))
            END
          )
        )
    )
  );

DROP POLICY IF EXISTS "course_content_approved_student_select" ON public.assessments;
CREATE POLICY "course_content_approved_student_select" ON public.assessments
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.modules m
      JOIN public.enrollments e ON e.course_id = m.course_id
      WHERE m.id = assessments.module_id
        AND e.user_id = auth.uid()
        AND e.status = 'approved'
        AND (
          COALESCE(e.access_override, false)
          OR EXISTS (
            SELECT 1
            FROM public.payments p
            WHERE p.enrollment_id = e.id
            GROUP BY p.enrollment_id
            HAVING COALESCE(SUM(p.amount_paid), 0) >= CASE
              WHEN COALESCE(SUM(p.amount), 0) <= 0 THEN 1
              WHEN GREATEST(COALESCE(MAX(p.total_installments), 1), 1) <= 1 THEN COALESCE(SUM(p.amount), 0)
              WHEN COALESCE(MAX(NULLIF(p.installment_amount, 0)), 0) > 0 THEN COALESCE(MAX(NULLIF(p.installment_amount, 0)), 0)
              ELSE CEIL(COALESCE(SUM(p.amount), 0)::numeric / GREATEST(COALESCE(MAX(p.total_installments), 1), 1))
            END
          )
        )
    )
  );

-- 00009 gave students FOR ALL on their own completion and progress rows, so a
-- payment_pending student could mark units complete or set a module to passed.
-- Students may still read their own rows. Writes stay with the service role
-- (the unit-complete and grading routes) and with the existing staff policies.
DROP POLICY IF EXISTS "unit_completions_own" ON public.unit_completions;
DROP POLICY IF EXISTS "unit_completions_select_own" ON public.unit_completions;
CREATE POLICY "unit_completions_select_own" ON public.unit_completions
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "module_progress_own" ON public.module_progress;
DROP POLICY IF EXISTS "module_progress_select_own" ON public.module_progress;
CREATE POLICY "module_progress_select_own" ON public.module_progress
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

COMMIT;
