-- A policy name this repo did not declare. 00032 must stop before changing anything.
CREATE POLICY modules_dashboard_read ON public.modules
  FOR SELECT TO authenticated
  USING (true);
