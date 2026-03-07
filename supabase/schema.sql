-- ─────────────────────────────────────────────────────────────────────────────
-- SproutAIGarden — Supabase Schema + RLS
-- Run this entire file in the Supabase SQL Editor (Dashboard → SQL Editor → New query)
-- ─────────────────────────────────────────────────────────────────────────────

-- ── 1. Tables ─────────────────────────────────────────────────────────────────

create table if not exists profiles (
  id            uuid        primary key references auth.users(id) on delete cascade,
  email         text        not null unique,
  display_name  text,
  country       text        not null check (country in ('PH', 'TH')),
  is_gardener   boolean     not null default false,
  created_at    timestamptz not null default now()
);

create table if not exists projects (
  id               bigint      primary key generated always as identity,
  country          text        not null check (country in ('PH', 'TH')),
  name             text        not null,
  built_by         text,
  built_for        text,
  capability       text,
  stage            text        not null default 'sprout'
                               check (stage in ('sprout', 'growing', 'blooming', 'thriving')),
  impact           text,
  impact_num       text,
  builder          text,
  builder_email    text        not null,
  zx               integer     not null default 40,
  zy               integer     not null default 50,
  notes            text[]      not null default '{}',
  milestones       text[]      not null default '{}',
  description      text,
  problem_space    text,
  data_source      text,
  demo_link        text,
  interested_users text[]      not null default '{}',
  image_url        text,
  last_updated     timestamptz not null default now(),
  created_at       timestamptz not null default now()
);

create table if not exists wishes (
  id               text        primary key,  -- format: "w" + integer, e.g. "w10"
  country          text        not null check (country in ('PH', 'TH')),
  title            text        not null,
  why              text,
  built_for        text,
  wisher_name      text,
  wisher_email     text        not null,
  upvoters         text[]      not null default '{}',
  fulfilled_by     text,                     -- project name; never delete fulfilled wishes
  claimed_by       text,
  claimed_by_email text,
  claimed_at       text,
  ready_for_review boolean     not null default false,
  prototype_link   text,
  prototype_note   text,
  created_at       timestamptz not null default now()
);

-- ── 2. Helper: is current user an admin? ──────────────────────────────────────

create or replace function is_admin()
returns boolean as $$
  select coalesce(
    (select is_gardener from profiles where id = auth.uid()),
    false
  );
$$ language sql security definer;

-- ── 3. Row Level Security ─────────────────────────────────────────────────────

-- profiles
alter table profiles enable row level security;

create policy "Public read"  on profiles for select using (true);
create policy "Own insert"   on profiles for insert with check (auth.uid() = id);
create policy "Own update"   on profiles for update
  using (auth.uid() = id) with check (auth.uid() = id);

-- projects
alter table projects enable row level security;

create policy "Authenticated read"   on projects for select
  using (auth.role() = 'authenticated');
create policy "Any user insert"      on projects for insert
  with check (auth.role() = 'authenticated');
create policy "Own or admin update"  on projects for update
  using (auth.email() = builder_email or is_admin());
create policy "Admin delete"         on projects for delete
  using (is_admin());

-- wishes
alter table wishes enable row level security;

create policy "Authenticated read"   on wishes for select
  using (auth.role() = 'authenticated');
create policy "Any user insert"      on wishes for insert
  with check (auth.role() = 'authenticated');
create policy "Own or admin update"  on wishes for update
  using (auth.email() = wisher_email or auth.email() = claimed_by_email or is_admin());
create policy "Admin delete"         on wishes for delete
  using (is_admin());
