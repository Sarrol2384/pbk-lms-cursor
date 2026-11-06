-- Course-content RLS. Paste manually in the Supabase SQL editor AFTER 00031.
-- Do not run this from the app, and do not run it against a database you have not backed up.
-- The whole change is one statement: if the preflight rejects it, nothing is altered.
--
-- What this replaces, by exact policy name only:
--   00009 unit_completions_own / unit_completions_service (FOR ALL, applies to PUBLIC)
--   00009 module_progress_own / module_progress_service (FOR ALL, applies to PUBLIC)
--   Staging preflight reported these six names and no others on the content tables:
--     assessments: assessments_manage, assessments_select
--     modules:     modules_manage_admin, modules_select
--     units:       units_manage_admin, units_select
-- Their expressions were not visible. This script does not infer them. It drops those
-- six names after the allowlist check, in this same statement, and installs
-- course_content_staff_all / course_content_student_select instead.
-- Any other policy name on these tables stops the statement. Nothing is changed.
--
-- Staff (super_admin, admin, lecturer) can read and write every module, unit, and
-- assessment without an enrolment. Students can read that content only when their
-- enrolment is approved AND (the first instalment is recorded OR access_override is
-- true). payment_pending, on_hold, rejected, and a partial payment below the first
-- instalment cannot read it. Students cannot insert, update, or delete progress.
-- The service role is not revoked; the API writes progress with that role, which
-- bypasses RLS. Anonymous grants on these tables are removed.
--
-- Checks go through private SECURITY DEFINER functions so a profiles policy that
-- itself reads profiles cannot recurse. Run this as the database owner (the SQL
-- editor role). Do not turn FORCE ROW LEVEL SECURITY on: the SQL editor should
-- still see rows. The Data API uses anon and authenticated, which do not bypass RLS.
--
-- First instalment matches src/lib/tuition.ts: sum of amount / amount_paid, plan taken
-- from the lowest installment_number. Due must be > 0. Pay-in-full uses the whole due.
-- Otherwise the stored installment_amount, or ceil(due / count) when that is 0.
-- No instalment scheduler is created.

DO $migration$
DECLARE
  r record;
  unexpected text := '';
  allowed boolean;
BEGIN
  SET LOCAL client_min_messages = warning;

  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'enrollments'
      AND column_name = 'access_override'
  ) THEN
    RAISE EXCEPTION 'Apply 00031_enrollment_access_override.sql first. enrollments.access_override is missing. Nothing was changed.';
  END IF;

  FOR r IN
    SELECT c.relname AS table_name, pol.polname AS policy_name
    FROM pg_policy pol
    JOIN pg_class c ON c.oid = pol.polrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relname IN ('modules', 'units', 'assessments', 'unit_completions', 'module_progress')
  LOOP
    allowed := (r.table_name = 'modules' AND r.policy_name IN (
        'course_content_staff_all', 'course_content_student_select',
        'modules_manage_admin', 'modules_select'
      ))
      OR (r.table_name = 'units' AND r.policy_name IN (
        'course_content_staff_all', 'course_content_student_select',
        'units_manage_admin', 'units_select'
      ))
      OR (r.table_name = 'assessments' AND r.policy_name IN (
        'course_content_staff_all', 'course_content_student_select',
        'assessments_manage', 'assessments_select'
      ))
      OR (r.table_name = 'unit_completions' AND r.policy_name IN (
        'unit_completions_own', 'unit_completions_service', 'unit_completions_select_own',
        'unit_completions_staff_all', 'unit_completions_student_select'
      ))
      OR (r.table_name = 'module_progress' AND r.policy_name IN (
        'module_progress_own', 'module_progress_service', 'module_progress_select_own',
        'module_progress_staff_all', 'module_progress_student_select'
      ));
    IF NOT allowed THEN
      unexpected := unexpected || format(E'\n- public.%I policy %I', r.table_name, r.policy_name);
    END IF;
  END LOOP;

  IF unexpected <> '' THEN
    RAISE EXCEPTION 'Refusing to change course-content RLS. These policies are not on the allowlist and were left untouched:% Nothing was changed. The allowlist is the 00009 progress policies, the policies this script installs, and the six names reported by the staging preflight. Do not delete anything else from a name or expression guess.', unexpected;
  END IF;

  EXECUTE 'CREATE SCHEMA IF NOT EXISTS private';
  EXECUTE 'REVOKE ALL ON SCHEMA private FROM PUBLIC';
  EXECUTE 'GRANT USAGE ON SCHEMA private TO authenticated';

  EXECUTE $fn$
    CREATE OR REPLACE FUNCTION private.is_course_staff()
    RETURNS boolean
    LANGUAGE sql
    STABLE
    SECURITY DEFINER
    SET search_path = ''
    AS $body$
      SELECT EXISTS (
        SELECT 1
        FROM public.profiles pr
        WHERE pr.id = auth.uid()
          AND pr.role IN ('super_admin', 'admin', 'lecturer')
      );
    $body$
  $fn$;

  EXECUTE $fn$
    CREATE OR REPLACE FUNCTION private.tuition_meets_first_instalment(p_enrollment_id uuid)
    RETURNS boolean
    LANGUAGE sql
    STABLE
    SECURITY DEFINER
    SET search_path = ''
    AS $body$
      WITH totals AS (
        SELECT
          COALESCE(SUM(p.amount), 0)::bigint AS total_due,
          COALESCE(SUM(p.amount_paid), 0)::bigint AS total_paid
        FROM public.payments p
        WHERE p.enrollment_id = p_enrollment_id
      ),
      plan AS (
        SELECT
          GREATEST(COALESCE(p.total_installments, 1), 1) AS installments,
          COALESCE(p.installment_amount, 0)::bigint AS installment_amount
        FROM public.payments p
        WHERE p.enrollment_id = p_enrollment_id
        ORDER BY p.installment_number ASC NULLS LAST, p.created_at ASC NULLS LAST, p.id ASC
        LIMIT 1
      )
      SELECT COALESCE((
        SELECT
          t.total_due > 0
          AND t.total_paid >= CASE
            WHEN plan.installments <= 1 THEN t.total_due
            WHEN plan.installment_amount > 0 THEN plan.installment_amount
            ELSE CEIL(t.total_due::numeric / plan.installments)::bigint
          END
        FROM totals t
        LEFT JOIN plan ON true
      ), false);
    $body$
  $fn$;

  EXECUTE $fn$
    CREATE OR REPLACE FUNCTION private.can_read_course(p_course_id uuid)
    RETURNS boolean
    LANGUAGE sql
    STABLE
    SECURITY DEFINER
    SET search_path = ''
    AS $body$
      SELECT
        private.is_course_staff()
        OR EXISTS (
          SELECT 1
          FROM public.enrollments e
          WHERE e.course_id = p_course_id
            AND e.user_id = auth.uid()
            AND e.status = 'approved'
            AND (
              COALESCE(e.access_override, false)
              OR private.tuition_meets_first_instalment(e.id)
            )
        );
    $body$
  $fn$;

  EXECUTE $fn$
    CREATE OR REPLACE FUNCTION private.can_read_module(p_module_id uuid)
    RETURNS boolean
    LANGUAGE sql
    STABLE
    SECURITY DEFINER
    SET search_path = ''
    AS $body$
      SELECT COALESCE((
        SELECT private.can_read_course(m.course_id)
        FROM public.modules m
        WHERE m.id = p_module_id
      ), false);
    $body$
  $fn$;

  EXECUTE $fn$
    CREATE OR REPLACE FUNCTION private.can_read_unit(p_unit_id uuid)
    RETURNS boolean
    LANGUAGE sql
    STABLE
    SECURITY DEFINER
    SET search_path = ''
    AS $body$
      SELECT COALESCE((
        SELECT private.can_read_module(u.module_id)
        FROM public.units u
        WHERE u.id = p_unit_id
      ), false);
    $body$
  $fn$;

  EXECUTE 'REVOKE ALL ON FUNCTION private.is_course_staff() FROM PUBLIC';
  EXECUTE 'REVOKE ALL ON FUNCTION private.tuition_meets_first_instalment(uuid) FROM PUBLIC';
  EXECUTE 'REVOKE ALL ON FUNCTION private.can_read_course(uuid) FROM PUBLIC';
  EXECUTE 'REVOKE ALL ON FUNCTION private.can_read_module(uuid) FROM PUBLIC';
  EXECUTE 'REVOKE ALL ON FUNCTION private.can_read_unit(uuid) FROM PUBLIC';
  EXECUTE 'GRANT EXECUTE ON FUNCTION private.is_course_staff() TO authenticated';
  EXECUTE 'GRANT EXECUTE ON FUNCTION private.can_read_course(uuid) TO authenticated';
  EXECUTE 'GRANT EXECUTE ON FUNCTION private.can_read_module(uuid) TO authenticated';
  EXECUTE 'GRANT EXECUTE ON FUNCTION private.can_read_unit(uuid) TO authenticated';

  -- Drop the 00009 PUBLIC policies and any select-only stand-ins from an earlier draft.
  EXECUTE 'DROP POLICY IF EXISTS unit_completions_own ON public.unit_completions';
  EXECUTE 'DROP POLICY IF EXISTS unit_completions_service ON public.unit_completions';
  EXECUTE 'DROP POLICY IF EXISTS unit_completions_select_own ON public.unit_completions';
  EXECUTE 'DROP POLICY IF EXISTS module_progress_own ON public.module_progress';
  EXECUTE 'DROP POLICY IF EXISTS module_progress_service ON public.module_progress';
  EXECUTE 'DROP POLICY IF EXISTS module_progress_select_own ON public.module_progress';

  -- Exact names reported by the staging preflight. Dropped only after that allowlist check.
  EXECUTE 'DROP POLICY IF EXISTS modules_manage_admin ON public.modules';
  EXECUTE 'DROP POLICY IF EXISTS modules_select ON public.modules';
  EXECUTE 'DROP POLICY IF EXISTS units_manage_admin ON public.units';
  EXECUTE 'DROP POLICY IF EXISTS units_select ON public.units';
  EXECUTE 'DROP POLICY IF EXISTS assessments_manage ON public.assessments';
  EXECUTE 'DROP POLICY IF EXISTS assessments_select ON public.assessments';

  EXECUTE 'ALTER TABLE public.modules ENABLE ROW LEVEL SECURITY';
  EXECUTE 'ALTER TABLE public.units ENABLE ROW LEVEL SECURITY';
  EXECUTE 'ALTER TABLE public.assessments ENABLE ROW LEVEL SECURITY';
  EXECUTE 'ALTER TABLE public.unit_completions ENABLE ROW LEVEL SECURITY';
  EXECUTE 'ALTER TABLE public.module_progress ENABLE ROW LEVEL SECURITY';

  EXECUTE 'DROP POLICY IF EXISTS course_content_staff_all ON public.modules';
  EXECUTE $pol$
    CREATE POLICY course_content_staff_all ON public.modules
      FOR ALL TO authenticated
      USING (private.is_course_staff())
      WITH CHECK (private.is_course_staff())
  $pol$;
  EXECUTE 'DROP POLICY IF EXISTS course_content_student_select ON public.modules';
  EXECUTE $pol$
    CREATE POLICY course_content_student_select ON public.modules
      FOR SELECT TO authenticated
      USING (private.can_read_course(course_id))
  $pol$;

  EXECUTE 'DROP POLICY IF EXISTS course_content_staff_all ON public.units';
  EXECUTE $pol$
    CREATE POLICY course_content_staff_all ON public.units
      FOR ALL TO authenticated
      USING (private.is_course_staff())
      WITH CHECK (private.is_course_staff())
  $pol$;
  EXECUTE 'DROP POLICY IF EXISTS course_content_student_select ON public.units';
  EXECUTE $pol$
    CREATE POLICY course_content_student_select ON public.units
      FOR SELECT TO authenticated
      USING (private.can_read_module(module_id))
  $pol$;

  EXECUTE 'DROP POLICY IF EXISTS course_content_staff_all ON public.assessments';
  EXECUTE $pol$
    CREATE POLICY course_content_staff_all ON public.assessments
      FOR ALL TO authenticated
      USING (private.is_course_staff())
      WITH CHECK (private.is_course_staff())
  $pol$;
  EXECUTE 'DROP POLICY IF EXISTS course_content_student_select ON public.assessments';
  EXECUTE $pol$
    CREATE POLICY course_content_student_select ON public.assessments
      FOR SELECT TO authenticated
      USING (private.can_read_module(module_id))
  $pol$;

  EXECUTE 'DROP POLICY IF EXISTS unit_completions_staff_all ON public.unit_completions';
  EXECUTE $pol$
    CREATE POLICY unit_completions_staff_all ON public.unit_completions
      FOR ALL TO authenticated
      USING (private.is_course_staff())
      WITH CHECK (private.is_course_staff())
  $pol$;
  EXECUTE 'DROP POLICY IF EXISTS unit_completions_student_select ON public.unit_completions';
  EXECUTE $pol$
    CREATE POLICY unit_completions_student_select ON public.unit_completions
      FOR SELECT TO authenticated
      USING (user_id = auth.uid() AND private.can_read_unit(unit_id))
  $pol$;

  EXECUTE 'DROP POLICY IF EXISTS module_progress_staff_all ON public.module_progress';
  EXECUTE $pol$
    CREATE POLICY module_progress_staff_all ON public.module_progress
      FOR ALL TO authenticated
      USING (private.is_course_staff())
      WITH CHECK (private.is_course_staff())
  $pol$;
  EXECUTE 'DROP POLICY IF EXISTS module_progress_student_select ON public.module_progress';
  EXECUTE $pol$
    CREATE POLICY module_progress_student_select ON public.module_progress
      FOR SELECT TO authenticated
      USING (user_id = auth.uid() AND private.can_read_module(module_id))
  $pol$;

  -- Direct grants survive REVOKE FROM PUBLIC. Grant the API roles we intend to keep,
  -- then remove anon and PUBLIC so a later RLS miss cannot expose the tables.
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role') THEN
    EXECUTE 'GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.modules TO service_role';
    EXECUTE 'GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.units TO service_role';
    EXECUTE 'GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.assessments TO service_role';
    EXECUTE 'GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.unit_completions TO service_role';
    EXECUTE 'GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.module_progress TO service_role';
  END IF;

  EXECUTE 'GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.modules TO authenticated';
  EXECUTE 'GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.units TO authenticated';
  EXECUTE 'GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.assessments TO authenticated';
  EXECUTE 'GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.unit_completions TO authenticated';
  EXECUTE 'GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.module_progress TO authenticated';

  EXECUTE 'REVOKE ALL ON TABLE public.modules FROM PUBLIC';
  EXECUTE 'REVOKE ALL ON TABLE public.units FROM PUBLIC';
  EXECUTE 'REVOKE ALL ON TABLE public.assessments FROM PUBLIC';
  EXECUTE 'REVOKE ALL ON TABLE public.unit_completions FROM PUBLIC';
  EXECUTE 'REVOKE ALL ON TABLE public.module_progress FROM PUBLIC';

  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    EXECUTE 'REVOKE ALL ON TABLE public.modules FROM anon';
    EXECUTE 'REVOKE ALL ON TABLE public.units FROM anon';
    EXECUTE 'REVOKE ALL ON TABLE public.assessments FROM anon';
    EXECUTE 'REVOKE ALL ON TABLE public.unit_completions FROM anon';
    EXECUTE 'REVOKE ALL ON TABLE public.module_progress FROM anon';
  END IF;
END
$migration$;
