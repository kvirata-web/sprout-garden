-- Migration 08: Add data_sources array column to projects
-- Run in Supabase dashboard SQL editor

ALTER TABLE projects
  ADD COLUMN IF NOT EXISTS data_sources text[] DEFAULT '{}';
