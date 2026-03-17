-- supabase/migrations/06-add-has-dismissed-welcome.sql
-- Add has_dismissed_welcome column to profiles (required by E2 welcome modal)

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS has_dismissed_welcome boolean NOT NULL DEFAULT false;
