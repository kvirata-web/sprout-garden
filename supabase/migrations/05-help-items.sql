-- supabase/migrations/05-help-items.sql
-- Create help_items table for the Help panel feature

CREATE TABLE IF NOT EXISTS help_items (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type         text NOT NULL CHECK (type IN ('report', 'ask')),
  title        text NOT NULL,
  description  text,
  submitted_by text NOT NULL,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now(),
  status       text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'resolved', 'unanswered', 'answered')),
  resolved_by  text,
  resolved_at  timestamptz,
  upvoters     text[] NOT NULL DEFAULT '{}'
);

-- Auto-update updated_at on row changes (scoped name to avoid conflicts with other tables)
CREATE OR REPLACE FUNCTION help_items_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER help_items_updated_at
  BEFORE UPDATE ON help_items
  FOR EACH ROW EXECUTE FUNCTION help_items_set_updated_at();

-- RLS
ALTER TABLE help_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated read" ON help_items
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Own insert" ON help_items
  FOR INSERT WITH CHECK (
    auth.role() = 'authenticated'
    AND submitted_by = auth.email()
  );

-- Submitters can edit title/description while item is open/unanswered
CREATE POLICY "Submitter edit while open" ON help_items
  FOR UPDATE USING (
    submitted_by = auth.email()
    AND status IN ('open', 'unanswered')
  );

-- Admins can update any field (status, resolved_by, resolved_at, upvoters)
CREATE POLICY "Admin update" ON help_items
  FOR UPDATE USING (is_admin());

-- Admins can delete
CREATE POLICY "Admin delete" ON help_items
  FOR DELETE USING (is_admin());
