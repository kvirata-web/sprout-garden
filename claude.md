# AGENTS.md — SproutAIGarden
## Standing Instructions for Claude Code

> Read this file completely before writing a single line of code.
> After reading, confirm: "I have read AGENTS.md and am ready to build."
> The PRD (`SproutAIGarden_PRD.docx`) is the product authority. This file is the build authority.

> ⚠️ **PRD override notes — read before touching the PRD:**
> The PRD was written during the prototype phase. Some references are outdated. Ignore them and follow AGENTS.md instead:
> - The PRD mentions **Firebase** for auth → ignore. Auth is **Supabase**.
> - The PRD mentions **"React artifact environment"** and **"localStorage in artifact"** → ignore. The environment is a standard **Vite app**.
> - All other PRD content (features, data model, UI rules, permissions) remains valid.

---

## 1. What This Project Is

SproutAIGarden is an internal AI project tracker for Sprout — offices in the **Philippines (PH)** and **Thailand (TH)**. It tracks AI initiatives from seed idea → prototype → production.

The UI prototype is `src/App.jsx` (converted from `SproutAIGarden_v9.jsx`). It is functionally complete. The job now is to give it a real backend and deploy it.

---

## 2. Tech Stack (v1 only — keep it simple)

| Layer | Tool | Notes |
|---|---|---|
| Frontend | React + Vite | Single file: `src/App.jsx` |
| Database | Supabase (Postgres) | Tables: `profiles`, `projects`, `wishes` |
| Auth | Supabase Auth | Email + password only |
| Hosting | Vercel | Auto-deploy from `main` branch |

**That's it. Nothing else for v1.**

### Environment Variables
Never hardcode secrets. Use `.env.local` for local dev, Vercel environment variables for production.

```
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
```

Never commit `.env.local` to git. Confirm `.gitignore` includes it before first push.

---

## 3. Hard Constraints — Never Violate

From PRD Section 7.2. Any violation is a build failure.

- **Never use emoji flags (🇵🇭 🇹🇭) as primary flag display.** SVG inline only.
- **Never use external image URLs for project card thumbnails.** Use `ProjectImage` SVG component.
- **Never make `country` user-editable.** Derived from email domain at signup. Immutable forever.
- **Never allow `stage = "seed"` on a Project record.** Seeds live in Wishlist only.
- **Never delete a fulfilled wish.** Mark it, keep it visible.
- **Never show the self-promote button to anyone except the wish claimer or an Admin.**
- **Never use `localStorage` or `sessionStorage` directly.** Supabase SDK manages its own session — that is the only exception.
- **Never add `<>` stage navigation buttons to the Board view.** Drag-and-drop only.
- **Never skip a permission check before any state mutation.**
- **Never commit API keys or secrets to git.**

---

## 4. Permissions — Two Roles Only

### Normal User (any authenticated employee)

| Action | Allowed | Rule |
|---|---|---|
| Submit a Seed (wish) | ✅ | Always |
| Edit their own Seed | ✅ | `wisherEmail === authUser.email` |
| Upvote any Seed | ✅ | Once per Seed |
| Claim an unclaimed Seed | ✅ | `claimedBy === null` |
| Add a Plant (project) | ✅ | Any employee documenting a real initiative |
| Edit their own Plant | ✅ | `builderEmail === authUser.email` |
| Change stage of their own Plant | ✅ | Adjacent stages only |
| Edit someone else's Seed or Plant | ❌ | — |
| Delete anything | ❌ | — |
| Change country | ❌ | Immutable always |

### Admin (`is_gardener = true`, ~1–2 people)

Everything a Normal User can do, plus:

| Action | Allowed |
|---|---|
| Edit any Seed or Plant | ✅ |
| Delete any Seed or Plant | ✅ |
| Change stage of any Plant (can skip stages) | ✅ |
| Moderate duplicates / bad records | ✅ |

**Rule:** Check permissions at the START of every mutation. If it fails: don't mutate, show an error message, log the attempt. No silent failures.

**Also enforce in Supabase RLS** — not just the React UI. A user bypassing the UI must still be blocked at the database level.

---

## 5. Data Model — Key Rules

Full schemas in PRD Section 2. Critical rules:

**profiles**
- `country`: set at signup from email domain. Never updatable. Never send it in an UPDATE payload.
- `is_gardener`: default false. Set only via Supabase dashboard by a human admin. Never by the app.

**projects**
- `stage`: `sprout | growing | blooming | thriving` only. Never `seed`.
- `country`: auto-set from user profile at creation. Immutable.
- `last_updated`: set to `now()` on every mutation. Calculate "days ago" at query time — no scheduled job needed.

**wishes**
- `id`: format `"w" + integer`, e.g. `"w10"`.
- `country`: auto-set from user profile. Immutable.
- `fulfilled_by`: set when promoted to a Plant. Never delete fulfilled wishes.
- `upvoters`: array of display names. One vote per user. No duplicates.

### Calculating "days ago" without a scheduled job

```javascript
const daysAgo = (timestamp) =>
  Math.floor((Date.now() - new Date(timestamp).getTime()) / 86400000);
```

Use this on `last_updated` (projects) and `created_at` (wishes) on every data load. No cron needed.

---

## 6. Country & Auth Rules

- Allowed domains: `@sprout.ph` → `"PH"` | `@sproutsolutions.io` → `"TH"`
- Any other domain: reject with a clear error message
- First login: create `profiles` row, derive `country` from email domain
- Subsequent logins: load existing profile
- Session must survive browser refresh (Supabase handles this automatically)
- Logout clears the session

---

## 7. Build Phases & Progress

Four phases. Complete in order. Do not start the next phase until done-states are confirmed.

| Phase | Name | Status | Cumulative % |
|---|---|---|---|
| 0 | Scaffold — Vite app runs locally | ✅ Complete | 10% |
| 1 | Supabase — tables, auth, domain validation, RLS | ✅ Complete | 35% |
| 2 | Data layer — replace in-memory state with Supabase | ✅ Complete | 75% |
| 3 | Deploy — Vercel, live URL | ⬜ Not started | 100% |

---

### Phase 0 — Scaffold
**Tasks:**
1. Run `npx create-vite@latest sprout-garden --template react`
2. Copy `SproutAIGarden_v9.jsx` → `src/App.jsx`
3. Install dependencies: `npm install @supabase/supabase-js`
4. Run `npm run dev` — confirm app loads at `localhost:5173`
5. Create `.env.local` (empty for now), confirm it's in `.gitignore`
6. Push to a new GitHub repo

**Done-state:** App runs locally. UI looks identical to the prototype. GitHub repo exists with `.env.local` gitignored.

---

### Phase 1 — Supabase
**Tasks:**
1. Create `profiles`, `projects`, `wishes` tables using schemas in Section 5
2. Enable Row Level Security on all three tables
3. Apply RLS policies from Section 10
4. Enable Supabase Auth (email provider only)
5. Replace demo auth in `App.jsx` with real Supabase login screen
6. Add domain validation — block non-Sprout emails with a clear error
7. On first login: auto-create `profiles` row with `country` from email domain
8. On subsequent logins: load existing profile
9. Test: log in as a `@sprout.ph` email → country = "PH" shown in nav

**Done-state:** Real Sprout emails can log in. Non-Sprout emails are blocked. Country auto-sets and shows in the nav. Session survives refresh.

---

### Phase 2 — Data Layer
**Tasks:**
1. Create `src/lib/supabase.js` with the Supabase client
2. Replace `INITIAL_PROJECTS` → load from `projects` table on mount
3. Replace `INITIAL_WISHES` → load from `wishes` table on mount
4. Wire all project mutations (add, edit, stage change, add note) → Supabase upsert
5. Wire all wish mutations (add, claim, upvote, fulfill) → Supabase upsert
6. Wire admin deletes → Supabase delete (RLS blocks non-admins at database level)
7. Seed the database: add demo projects and wishes directly in Supabase dashboard
8. Test: add a project → hard refresh browser → project still there

**Done-state:** All data persists across refreshes. A project added by one user is visible to another after they refresh.

---

### Phase 3 — Deploy
**Tasks:**
1. Add `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` to `.env.local`
2. Confirm `.env.local` is gitignored before pushing
3. Connect GitHub repo to Vercel
4. Add the same environment variables in Vercel dashboard
5. Deploy — get live `.vercel.app` URL
6. Test: open the live URL, log in with a real Sprout email, confirm it works

**Done-state:** A real Sprout employee can open the URL, log in, and use the product. 🎉

---

## 8. Progress Reporting — After Every Task

```
✅ Just done: [what was completed]
📊 Progress: [X]% complete
⏭️ Next: [the next task]
🚧 Blockers: [any decisions needed from you, or "none"]
```

After completing a full phase: update the phase table in Section 7 (⬜ → ✅), state all done-states are confirmed, and **wait for the product owner to say "go" before starting the next phase.**

---

## 9. When to Stop and Ask

Stop immediately if:

- A new country domain is needed (not `@sprout.ph` or `@sproutsolutions.io`)
- Any request to add a new stage beyond `thriving`
- Any request to make `country` editable
- You are about to violate a hard constraint from Section 3
- An error cannot be resolved within 2 attempts
- Any decision that changes the permissions model

When escalating: explain what you were doing, what the blocker is, and what your options are. Do not invent product decisions.

---

## 10. Supabase RLS Policies

```sql
-- Helper: is current user an admin?
create or replace function is_admin()
returns boolean as $$
  select coalesce(
    (select is_gardener from profiles where id = auth.uid()),
    false
  );
$$ language sql security definer;

-- profiles: anyone can read, users update only their own row
alter table profiles enable row level security;
create policy "Public read" on profiles for select using (true);
create policy "Own update" on profiles for update
  using (auth.uid() = id) with check (auth.uid() = id);

-- projects: authenticated users can read and insert
-- update: own record or admin | delete: admin only
alter table projects enable row level security;
create policy "Authenticated read" on projects for select
  using (auth.role() = 'authenticated');
create policy "Any user insert" on projects for insert
  with check (auth.role() = 'authenticated');
create policy "Own or admin update" on projects for update
  using (auth.email() = builder_email OR is_admin());
create policy "Admin delete" on projects for delete
  using (is_admin());

-- wishes: authenticated users can read and insert
-- update: wisher or claimer or admin | delete: admin only
alter table wishes enable row level security;
create policy "Authenticated read" on wishes for select
  using (auth.role() = 'authenticated');
create policy "Any user insert" on wishes for insert
  with check (auth.role() = 'authenticated');
create policy "Own or admin update" on wishes for update
  using (auth.email() = wisher_email OR auth.email() = claimed_by_email OR is_admin());
create policy "Admin delete" on wishes for delete
  using (is_admin());
```

---

## 11. Stage Transition Rules

1. Check: `builderEmail === authUser.email` OR `authUser.isGardener === true`
2. Target stage must be in `['sprout', 'growing', 'blooming', 'thriving']`
3. Target must not equal current stage
4. Normal users: adjacent stages only
5. Admins: can skip stages in any direction
6. On success: update `stage`, set `last_updated = now()`, append milestone label + date
7. On failure: surface clear error to user, no state change

---

## 12. v2 Backlog — Do Not Build in v1

Do not add any of these unless the product owner explicitly asks:

- Realtime subscriptions (page refresh to sync is acceptable in v1)
- Scheduled jobs / pg_cron (use `daysAgo()` calculation instead)
- Email notifications
- Sentry / error monitoring
- Custom domain (Vercel subdomain is fine at launch)
- Slack / Teams integration
- Mobile-specific layout optimisations

---

## 13. Escalation Contact

**Product Owner:** Sprout Product Team
**Countries in scope:** Philippines (PH) + Thailand (TH)
**Last permissions update:** March 2026 — two-role model (Normal User + Admin)

---

*Update Section 7 phase table whenever a phase is completed.*
