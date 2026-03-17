-- Migration 07: Add collaborator_emails to projects
-- Run in Supabase SQL editor before deploying

ALTER TABLE projects
ADD COLUMN IF NOT EXISTS collaborator_emails text[] DEFAULT '{}';
