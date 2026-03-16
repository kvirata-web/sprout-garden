# Grove v2 — Design Document
*Generated from grove_v2_spec.md, March 2026*

---

## Summary

Grove v2 upgrades the stage pipeline from 5 stages to 6, introduces a formal ExCom approval gate (Nursery), renames stages throughout, adds a new `is_execom` role, and wires in-app + email notifications via Supabase for key review events.

---

## 1. Stage Pipeline Rename

### Old → New

| Old | New |
|---|---|
| Sprout | Seedling |
| Growing | Sprout |
| Blooming | Bloom |
| Thriving | Thriving (unchanged) |
| *(new)* | Nursery (between Seedling and Sprout) |

### New pipeline order
`seedling → nursery → sprout → bloom → thriving`

Stage values in DB: `seedling`, `nursery`, `sprout`, `bloom`, `thriving`

Seeds remain in the `wishes` table — not a stage in `projects`.

### DB Migration
Must run as a single transaction to avoid stage collision during intermediate state:
```sql
BEGIN;
UPDATE projects SET stage = 'seedling' WHERE stage = 'sprout';
UPDATE projects SET stage = 'sprout'   WHERE stage = 'growing';
UPDATE projects SET stage = 'bloom'    WHERE stage = 'blooming';
-- thriving unchanged
COMMIT;
```

---

## 2. Navigation Change

- Tab "Wishlist" → renamed to **Seeds**
- Nav: `Overview | Garden | Seeds`
- Internal view id `"wishlist"` can stay as-is (rename is display-only)

---

## 3. New Role: ExCom

### DB
Add `is_execom boolean default false` to `profiles` table.
Set manually via Supabase dashboard. Never set by the app.

### Auth State
Add `isExcom` field to `authUser` object alongside `isGardener`.
Load from `profiles.is_execom` the same way `isGardener` is loaded today.

### Permissions
| Action | Employee | Gardener | ExCom |
|---|---|---|---|
| Submit a Seed | ✓ | ✓ | ✓ |
| Claim a Seed | ✓ | ✓ | ✓ |
| Create a Plant (direct) | ✓ | ✓ | ✓ |
| Edit own Plant | ✓ | ✓ | ✓ |
| Edit any Plant | ✗ | ✓ | ✗ |
| Move own Plant (adjacent stages) | ✓ | ✓ | ✓ |
| Skip stages | ✗ | ✓ | ✗ |
| Submit own Plant to Nursery | ✓ | ✓ | ✓ |
| Withdraw own Nursery submission | ✓ | ✓ | ✓ |
| Approve / Needs Rework in Nursery | ✗ | ✗ | ✓ |
| Delete any Seed or Plant | ✗ | ✓ | ✗ |
| Un-claim own Seed (delete linked Plant) | ✓ (own) | ✓ | ✓ |

Note: Gardeners can hold `is_execom = true` simultaneously. ExCom does NOT get drag-and-drop stage skip — that remains Gardener only.

---

## 4. Nursery Submission Flow (Seedling → Nursery)

### Required Fields
Builder must fill both before submitting:
- `prototype_link` — valid URL to deployed prototype (not Figma, not Loom)
- `deck_link` — valid URL to presentation deck

### Flow
1. Builder fills `prototype_link` + `deck_link` in detail panel
2. CTA "Submit for Nursery Review" activates once both are valid URLs
3. Builder clicks → inline confirmation inside panel:
   - Shows both URLs for review
   - Warning: editing is locked until ExCom decides
   - Buttons: Cancel | Confirm Submission
4. On Confirm:
   - `stage = 'nursery'`
   - `submitted_at = now()`
   - `review_status = 'pending'`
   - Plant locked (all fields read-only for builder)
   - Notification sent to all `is_execom` users

### What "Locked" Means
While `review_status = 'pending'` (Plant is in Nursery and awaiting decision):
- All fields read-only for the builder in the UI
- Gardeners can still edit (their update path is not restricted)
- RLS: builder update policy adds check: `review_status IS DISTINCT FROM 'pending' OR is_admin()`

### Withdrawal
- "Withdraw Submission" button visible in panel footer (secondary style) while `stage = 'nursery'` and `review_status = 'pending'`
- Visible to: builder (owner) and Gardeners. Not ExCom-specific.
- On withdraw: `stage → seedling`, `review_status → null`, `submitted_at` preserved for audit, Plant unlocked
- No comment required
- Plant is immediately eligible for re-submission after withdrawal

---

## 5. ExCom Review Flow (Nursery → Decision)

### Card UI
- Footer shows "Submitted X days ago" — days calculated from `submitted_at`
- After 7 days: footer text shifts to `caution` (orange) tone — visual only, no automation
- Unread dot for ExCom: driven by whether a `notifications` row for that project exists and is `read = false` for the current ExCom user. Dot clears when ExCom opens the detail panel (sets notification `read = true`).

### Review Panel
All users see: title, builder, dept, country, description, submitted date, prototype link, deck link.

ExCom users additionally see the **Decision Zone**:
- **Approve** (success/green) — no comment required
- **Needs Rework** (caution/orange) — comment required, cannot submit without it

Non-ExCom see "Under review by ExCom." in place of the decision zone.

### On Approve
- `stage → sprout`
- `review_status → approved`
- `reviewed_by`, `reviewed_at` recorded
- Milestone logged: label `"Approved by ExCom"` + current date (same format as existing milestone entries)
- Builder notified (in-app + email)

### On Needs Rework
- ExCom comment required
- `stage → seedling`
- `review_status → needs_rework`
- `review_comment`, `reviewed_by`, `reviewed_at` recorded
- Plant unlocked
- Builder notified (in-app + email)
- In builder's detail panel: `caution` tone indicator "Feedback available" — builder expands to read comment

---

## 6. DB Changes — projects table

New fields:
| Field | Type | Notes |
|---|---|---|
| `prototype_link` | text, nullable | Must be valid URL |
| `deck_link` | text, nullable | Must be valid URL |
| `review_status` | text, nullable | CHECK constraint: `IN ('pending', 'approved', 'needs_rework')` |
| `review_comment` | text, nullable | Required when `review_status = 'needs_rework'` |
| `reviewed_by` | text, nullable | Email of ExCom reviewer |
| `reviewed_at` | timestamptz, nullable | When decision was made |
| `submitted_at` | timestamptz, nullable | When builder submitted — preserved on withdrawal |

SQL for CHECK constraint:
```sql
ALTER TABLE projects
  ADD COLUMN prototype_link text,
  ADD COLUMN deck_link text,
  ADD COLUMN review_status text CHECK (review_status IN ('pending', 'approved', 'needs_rework')),
  ADD COLUMN review_comment text,
  ADD COLUMN reviewed_by text,
  ADD COLUMN reviewed_at timestamptz,
  ADD COLUMN submitted_at timestamptz;
```

---

## 7. Seedling Card — Two States

**State 1 — Incomplete** (missing prototype or deck)
- Card tone: `neutral`
- Footer chips: "Prototype needed" and/or "Deck needed" (ghost/outline style)
- No submit action

**State 2 — Ready to Submit** (both links filled)
- Card tone: `pending` (mango)
- Footer chip: "Ready for Nursery →"
- Clicking opens detail panel (not a direct submit)

### Seedling Column Header
Format: `🌱 Seedling [20] (3 ready)`

---

## 8. Dashboard Updates

### Tile Row (left to right)
Seeds | Seedling | Nursery | Sprout | Bloom | Thriving

### Tile Tones & Subtitles
| Tile | Tone | Subtitle |
|---|---|---|
| Seeds | neutral | Ideas waiting to be built |
| Seedling | neutral | Being built |
| Nursery | pending (mango) | Awaiting ExCom review |
| Sprout | information | Approved, in development |
| Bloom | success | In user testing |
| Thriving | accent | Live and delivering value |

### Nursery Tile Navigation
For ExCom users: navigates to Board **filtered to Nursery column only** (focused review queue).
For all other users: navigates to Board filtered to Nursery (read-only, same as other stage tiles).

---

## 9. Seed → Seedling Transition

### Claiming a Seed
- Seed marked `claimed_by_email`
- New Plant created: `stage = seedling`
- Plant linked to Seed: `wishes.fulfilled_by = project.id`
- Seed marked fulfilled

### Un-claiming
- Builder can release before Nursery submission (cannot un-claim once `stage = 'nursery'`)
- On release: `claimed_by_email` cleared, Seed returns to unclaimed, `fulfilled_by` cleared
- Plant record **deleted** — this is a user-initiated delete of their own nascent project, not the admin-only delete. RLS policy: allow delete when `builder_email = auth.email() AND stage = 'seedling'`.
- Original Seed submitter notified (in-app)

### Self-Started Plants
- Builders can create a Plant without a parent Seed → enters at `seedling`
- No `fulfilled_by` required

### Parallel Plants from One Seed
- Multiple builders can claim the same Seed
- Each creates their own Plant row; both Plants have `fulfilled_by` pointing to same wish id
- Grove detects this by counting Plants with same `fulfilled_by` value
- Visual indicator: small chip on the Seed card "2 builders" (or N builders) — no schema change needed
- No hard block on parallel claims

---

## 10. Notifications

### Events
| Event | Who gets notified | Channel |
|---|---|---|
| Plant submitted to Nursery | All `is_execom` users (queried at send time) | in-app + email |
| ExCom approves | Builder | in-app + email |
| ExCom returns Needs Rework | Builder | in-app + email |
| Builder un-claims a Seed | Original Seed submitter (`wisher_email`) | in-app only |

### In-App Implementation
- **Table:** `notifications` (`id uuid`, `user_id uuid references profiles(id)`, `type text`, `payload jsonb`, `read boolean default false`, `created_at timestamptz default now()`)
- Badge/dot in nav shows unread count. Dismissed on read (mark `read = true`).
- Unread dot on Nursery project cards: ExCom has an unread notification with `payload->>'project_id' = <id>`

### Email Implementation
- **Trigger mechanism:** Called directly from React app code (client-side `supabase.functions.invoke(...)`) immediately after each state mutation succeeds. No DB webhooks or Postgres triggers.
- **Supabase Edge Function:** `send-notification` — receives `{ type, payload }`, inserts notification rows, sends email.
- **Email provider:** Resend (API key stored as Supabase Edge Function secret via `supabase secrets set RESEND_API_KEY=...`)
- **New secret needed:** `RESEND_API_KEY` — add to Supabase project secrets (not `.env.local`, not Vercel). Document setup in project README.
- **ExCom recipient list:** Inside the Edge Function, use the Supabase `service_role` client (available as built-in env var `SUPABASE_SERVICE_ROLE_KEY` in Edge Functions) to query `SELECT email FROM profiles WHERE is_execom = true`. One notification row inserted per ExCom user.
- **Email templates:** 3 types:
  - `nursery-submitted` — sent to each ExCom member
  - `plant-approved` — sent to builder email
  - `plant-needs-rework` — sent to builder email with comment body included

---

## 11. Supabase RLS — New Policies Needed

```sql
-- is_execom helper (mirrors existing is_admin pattern)
create or replace function is_execom()
returns boolean as $$
  select coalesce(
    (select is_execom from profiles where id = auth.uid()),
    false
  );
$$ language sql security definer;

-- projects: update policy — builder blocked when plant is pending review
-- Replace existing "Own or admin update" policy:
drop policy if exists "Own or admin update" on projects;
create policy "Own or admin update" on projects for update
  using (
    (auth.email() = builder_email AND review_status IS DISTINCT FROM 'pending')
    OR is_admin()
    OR is_execom()
  );

-- projects: withdrawal — use a SECURITY DEFINER RPC to allow builder to clear
-- review_status while it is 'pending' (avoids the lock contradiction).
-- The RPC verifies ownership before acting.
create or replace function withdraw_from_nursery(p_id uuid)
returns void as $$
begin
  if not exists (
    select 1 from projects
    where id = p_id
      and builder_email = auth.email()
      and stage = 'nursery'
      and review_status = 'pending'
  ) then
    raise exception 'Not authorized or invalid state';
  end if;
  update projects
    set stage = 'seedling',
        review_status = null
    where id = p_id;
end;
$$ language plpgsql security definer;

-- projects: builder can delete their own un-submitted seedling (un-claim)
create policy "Builder delete own seedling" on projects for delete
  using (auth.email() = builder_email AND stage = 'seedling');

-- notifications table
alter table notifications enable row level security;
create policy "Own notifications read" on notifications for select
  using (auth.uid() = user_id);
create policy "Own notifications update" on notifications for update
  using (auth.uid() = user_id);
-- Insert is service role only (called from Edge Function)
```

Note: `is_admin()` refers to the existing helper that checks `is_gardener`.

### Un-claim sequence (B5 fix)
The un-claim action executes two writes in order:
1. **Delete the Plant** (RLS: builder-delete-own-seedling policy)
2. **Update the Wish**: clear `claimed_by_email` and `fulfilled_by` on the wish row

If step 1 fails → abort, show error. Nothing changed.
If step 2 fails → plant is gone but wish still shows claimed. Show error to user. A Gardener can manually clear the wish via edit. Acceptable for v2.

---

## 12. Frontend Constants to Update (App.jsx)

All these are already defined in `src/App.jsx` and must be updated as part of the implementation:

```javascript
// Line 111
const STAGES = ["seedling", "nursery", "sprout", "bloom", "thriving"];

// Stage labels
const STAGE_LABELS = {
  seedling: "Seedling", nursery: "Nursery",
  sprout: "Sprout", bloom: "Bloom", thriving: "Thriving"
};

// Stage descriptions
const STAGE_DESC = {
  seedling: "Being built",
  nursery:  "Awaiting ExCom review",
  sprout:   "Approved, in development",
  bloom:    "In user testing",
  thriving: "Live and delivering value",
};

// Stage order for sorting
const STAGE_ORDER = {
  seedling: 0, nursery: 1, sprout: 2, bloom: 3, thriving: 4
};

// Stage colors — map new stage names to design tokens
// seedling: neutral (same as old sprout mango)
// nursery: pending/mango
// sprout: information/wintermelon
// bloom: success/kangkong
// thriving: accent/blueberry
```

Plant SVG components: add `PlantSeedling` SVG component (simple small sprout). Existing `PlantSprout`, `PlantGrowing`, `PlantBlooming`, `PlantTree` are repurposed/renamed to match new stage names:
- `seedling` → new small plant SVG
- `nursery` → reuse existing small plant with a badge or pot indicator
- `sprout` → existing `PlantGrowing` SVG (repurposed)
- `bloom` → existing `PlantBlooming` SVG (repurposed)
- `thriving` → existing `PlantTree` SVG (unchanged)

Board drag-and-drop: Nursery stage is NOT a drop target for normal drag-and-drop. Plants cannot be dragged INTO Nursery — only the submission form can do that. Plants CAN be dragged out of Nursery by Gardeners only (skip privilege).

---

## 13b. Additional Clarifications

### Nav badge scope
Nav badge shows count of ALL unread notifications for the current user (all types). ExCom will see counts from submitted-to-nursery events; builders will see counts from approved/needs-rework events.

### review_status CHECK values
Allowed values: `'pending'`, `'approved'`, `'needs_rework'`. NULL is the default state (not submitted). No `'withdrawn'` state — withdrawal just sets `review_status = NULL`.

### Board "Nursery only" filter behavior
When Nursery tile is clicked, the Board renders only the Nursery column. Other stage columns are not rendered (same pattern as existing `stageFilter` on the Board, extended to support `'nursery'`).

### Notification rows: one per user
For the `nursery-submitted` event, the Edge Function inserts one `notifications` row per ExCom user. Each row has the ExCom user's `user_id`. The `payload` includes `{ project_id, project_name, builder_email, submitted_at }`.

---

## 14. Open Items (Resolved)

- ✅ Notifications in scope: in-app + email via Supabase Edge Function + Resend
- ✅ Nursery tile nav: filter to Nursery column only (focused review queue)
- ✅ Approval flow applies to both PH and TH
- ✅ Email provider: Resend (can swap — abstracted in Edge Function)

---

## 15. Hard Constraints

All constraints from CLAUDE.md Section 3 apply without exception.
Stage values in `projects`: `seedling | nursery | sprout | bloom | thriving`. Never `seed`.
Nursery entry is NOT drag-and-drop. It is a deliberate form submission action only.

---

*End of design document.*
