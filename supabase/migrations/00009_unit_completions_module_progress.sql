-- Unit completions: student has completed viewing/studying a unit
CREATE TABLE IF NOT EXISTS unit_completions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  unit_id UUID NOT NULL REFERENCES units(id) ON DELETE CASCADE,
  completed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, unit_id)
);

CREATE INDEX IF NOT EXISTS idx_unit_completions_user ON unit_completions(user_id);
CREATE INDEX IF NOT EXISTS idx_unit_completions_unit ON unit_completions(unit_id);

ALTER TABLE unit_completions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "unit_completions_own" ON unit_completions FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "unit_completions_service" ON unit_completions FOR ALL USING (
  auth.uid() IN (SELECT id FROM profiles WHERE role IN ('super_admin', 'admin', 'lecturer'))
);

-- Module progress: in_progress | passed (must pass before next module unlocks)
CREATE TABLE IF NOT EXISTS module_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  module_id UUID NOT NULL REFERENCES modules(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'in_progress' CHECK (status IN ('in_progress', 'passed')),
  completed_at TIMESTAMPTZ,
  UNIQUE(user_id, module_id)
);

CREATE INDEX IF NOT EXISTS idx_module_progress_user ON module_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_module_progress_module ON module_progress(module_id);

ALTER TABLE module_progress ENABLE ROW LEVEL SECURITY;
CREATE POLICY "module_progress_own" ON module_progress FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "module_progress_service" ON module_progress FOR ALL USING (
  auth.uid() IN (SELECT id FROM profiles WHERE role IN ('super_admin', 'admin', 'lecturer'))
);

COMMENT ON TABLE unit_completions IS 'Tracks which units a student has completed (viewed/marked complete).';
COMMENT ON TABLE module_progress IS 'Tracks module pass status; next module unlocks when previous is passed.';
