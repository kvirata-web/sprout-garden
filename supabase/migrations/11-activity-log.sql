-- 11-activity-log.sql
-- Immutable event log for major Grove activities.
-- Written fire-and-forget on: project added, stage moved,
-- submitted for approval, approved, seed planted, seed fulfilled.

create table if not exists activity_log (
  id          bigint generated always as identity primary key,
  event_type  text        not null,  -- project_added | stage_moved | submitted_for_approval | approved | seed_planted | seed_fulfilled
  actor_email text,
  actor_name  text,
  project_id  text,                  -- references projects.id (no FK — survives deletes)
  wish_id     text,                  -- references wishes.id
  from_stage  text,
  to_stage    text,
  entity_name text        not null,  -- denormalised project name or seed title for display
  created_at  timestamptz not null default now()
);

alter table activity_log enable row level security;

create policy "Authenticated read" on activity_log
  for select using (auth.role() = 'authenticated');

create policy "Authenticated insert" on activity_log
  for insert with check (auth.role() = 'authenticated');
