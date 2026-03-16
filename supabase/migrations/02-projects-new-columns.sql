-- Grove v2: Add Nursery review fields to projects table

ALTER TABLE projects
  ADD COLUMN IF NOT EXISTS prototype_link text,
  ADD COLUMN IF NOT EXISTS deck_link text,
  ADD COLUMN IF NOT EXISTS review_status text
    CHECK (review_status IN ('pending', 'approved', 'needs_rework')),
  ADD COLUMN IF NOT EXISTS review_comment text,
  ADD COLUMN IF NOT EXISTS reviewed_by text,
  ADD COLUMN IF NOT EXISTS reviewed_at timestamptz,
  ADD COLUMN IF NOT EXISTS submitted_at timestamptz;
