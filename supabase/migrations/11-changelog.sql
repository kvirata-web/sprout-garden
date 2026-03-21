-- Migration 11: Changelog table
-- Run in Supabase SQL editor (staging first, then production)

create table if not exists changelog (
  id           uuid primary key default gen_random_uuid(),
  entry_date   date not null,
  title        text not null,
  description  text not null,
  tags         text[] default '{}',
  is_milestone boolean default false,
  created_at   timestamptz default now()
);

alter table changelog enable row level security;

create policy "Authenticated read" on changelog for select
  using (auth.role() = 'authenticated');

create policy "Admin insert" on changelog for insert
  with check (is_admin());

create policy "Admin update" on changelog for update
  using (is_admin());

create policy "Admin delete" on changelog for delete
  using (is_admin());

-- Seed initial entries (newest first by entry_date)
insert into changelog (entry_date, title, description, tags, is_milestone) values

(
  '2026-03-21',
  'Staging environment + Help panel revamp',
  'Set up a separate staging environment (Supabase + Vercel preview) so changes can be tested before going live. Added About and What''s New tabs to the Help panel — including this changelog. Unified all department lists and fixed seed submission.',
  array['Feature'],
  false
),

(
  '2026-03-18',
  'Beta launch — ExCom & ManCom',
  'Grove opened to ExCom and ManCom leaders for the first time. First real users outside the build team.',
  array['Beta'],
  true
),

(
  '2026-03-18',
  'Garden horizon view + time-of-day background',
  'Replaced the floating plant layout with a horizon view — department columns, ground line, and a sky that changes with time of day across 6 windows (sunrise to night). Overview dashboard redesigned with pipeline tiles, Momentum feed, and My Corner.',
  array['Feature'],
  false
),

(
  '2026-03-17',
  'Grove v2 — 5-stage pipeline + Nursery approval gate',
  'New pipeline: Seedling → Nursery → Sprout → Bloom → Thriving. Nursery is an ExCom review gate requiring a prototype and deck before scaling. Seeds tab replaces Wishlist. Claiming a Seed auto-creates a Seedling. In-app notifications added.',
  array['Feature'],
  false
),

(
  '2026-03-16',
  'Grove v1 — internal launch',
  'Initial internal launch. Directory, Board, Garden, and Seeds views live. Real Supabase backend with Google SSO, row-level security, and full data persistence. Deployed on Vercel with auto-deploy from GitHub.',
  array['Launch'],
  true
);
