-- supabase/migrations/04-rename-role-columns.sql
-- Rename role columns on profiles table
ALTER TABLE profiles RENAME COLUMN is_gardener TO is_admin;
ALTER TABLE profiles RENAME COLUMN is_execom TO is_approver;

-- Add first_name column (used by E1 Google SSO and E2 welcome modal)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS first_name text;

-- Recreate is_admin() helper to reference renamed column
CREATE OR REPLACE FUNCTION is_admin()
RETURNS boolean AS $$
  SELECT COALESCE(
    (SELECT is_admin FROM profiles WHERE id = auth.uid()),
    false
  );
$$ LANGUAGE sql SECURITY DEFINER;

-- Drop the policy that depends on is_execom() FIRST, then drop the function
DROP POLICY IF EXISTS "Own or admin update" ON projects;
DROP FUNCTION IF EXISTS is_execom();

-- Recreate is_approver() helper (previously is_execom())
-- Referenced in Nursery review RLS policies
CREATE OR REPLACE FUNCTION is_approver()
RETURNS boolean AS $$
  SELECT COALESCE(
    (SELECT is_approver FROM profiles WHERE id = auth.uid()),
    false
  );
$$ LANGUAGE sql SECURITY DEFINER;

-- Recreate the policy using the new function names
CREATE POLICY "Own or admin update" ON projects
  FOR UPDATE USING (
    auth.email() = builder_email
    OR is_admin()
    OR is_approver()
  );
