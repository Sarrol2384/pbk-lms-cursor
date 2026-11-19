-- Names reported by the staging preflight of 00032. Expressions were not visible there.
-- These are typical broad stand-ins so the local fixture can prove the names are replaced.
-- The migration drops by exact name and does not read these expressions.

CREATE POLICY modules_select ON public.modules
  FOR SELECT TO authenticated
  USING (auth.uid() IS NOT NULL);

CREATE POLICY modules_manage_admin ON public.modules
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles pr
      WHERE pr.id = auth.uid() AND pr.role IN ('super_admin', 'admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles pr
      WHERE pr.id = auth.uid() AND pr.role IN ('super_admin', 'admin')
    )
  );

CREATE POLICY units_select ON public.units
  FOR SELECT TO authenticated
  USING (auth.uid() IS NOT NULL);

CREATE POLICY units_manage_admin ON public.units
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles pr
      WHERE pr.id = auth.uid() AND pr.role IN ('super_admin', 'admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles pr
      WHERE pr.id = auth.uid() AND pr.role IN ('super_admin', 'admin')
    )
  );

CREATE POLICY assessments_select ON public.assessments
  FOR SELECT TO authenticated
  USING (auth.uid() IS NOT NULL);

CREATE POLICY assessments_manage ON public.assessments
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles pr
      WHERE pr.id = auth.uid() AND pr.role IN ('super_admin', 'admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles pr
      WHERE pr.id = auth.uid() AND pr.role IN ('super_admin', 'admin')
    )
  );
