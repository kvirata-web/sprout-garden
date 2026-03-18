-- Migration 09: add agentic_framework array to projects
alter table projects
  add column if not exists agentic_framework text[] default '{}';
