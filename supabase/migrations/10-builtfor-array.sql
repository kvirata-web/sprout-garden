-- Migration 10: convert built_for from text to text[] on projects and wishes
ALTER TABLE projects
  ALTER COLUMN built_for TYPE text[]
  USING CASE WHEN built_for IS NULL THEN '{}' ELSE ARRAY[built_for] END;

ALTER TABLE wishes
  ALTER COLUMN built_for TYPE text[]
  USING CASE WHEN built_for IS NULL THEN '{}' ELSE ARRAY[built_for] END;
