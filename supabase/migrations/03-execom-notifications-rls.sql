-- Grove v2: ExCom role, notifications table, updated RLS policies

-- ── 1. Add is_execom to profiles ─────────────────────────────────────────────
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS is_execom boolean NOT NULL DEFAULT false;

-- ── 2. Create notifications table ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  type text NOT NULL,
  payload jsonb,
  read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Users can read their own notifications
CREATE POLICY "Own notifications read" ON notifications
  FOR SELECT USING (auth.uid() = user_id);

-- Users can mark their own notifications as read (update only)
CREATE POLICY "Own notifications update" ON notifications
  FOR UPDATE USING (auth.uid() = user_id);

-- Insert is service role only (called from Edge Function — no user policy needed)

-- ── 3. is_execom() helper function ───────────────────────────────────────────
-- Note: uses table alias to avoid ambiguity with the column name
CREATE OR REPLACE FUNCTION is_execom()
RETURNS boolean AS $$
  SELECT COALESCE(
    (SELECT p.is_execom FROM profiles p WHERE p.id = auth.uid()),
    false
  );
$$ LANGUAGE sql SECURITY DEFINER;

-- ── 4. Update projects update policy (lock when pending) ─────────────────────
-- Drop existing policy and replace with updated one that:
-- • Blocks builder from editing when review_status = 'pending'
-- • Gardeners (is_admin) and ExCom can always edit
DROP POLICY IF EXISTS "Own or admin update" ON projects;

CREATE POLICY "Own or admin update" ON projects
  FOR UPDATE USING (
    (auth.email() = builder_email AND review_status IS DISTINCT FROM 'pending')
    OR is_admin()
    OR is_execom()
  );

-- ── 5. Withdrawal RPC (bypasses lock, verifies ownership) ────────────────────
CREATE OR REPLACE FUNCTION withdraw_from_nursery(p_id uuid)
RETURNS void AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM projects
    WHERE id = p_id
      AND builder_email = auth.email()
      AND stage = 'nursery'
      AND review_status = 'pending'
  ) THEN
    RAISE EXCEPTION 'Not authorized or invalid state for withdrawal';
  END IF;
  UPDATE projects
    SET stage = 'seedling',
        review_status = NULL
    WHERE id = p_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ── 6. Builder can delete their own seedling (un-claim) ───────────────────────
CREATE POLICY "Builder delete own seedling" ON projects
  FOR DELETE USING (auth.email() = builder_email AND stage = 'seedling');
