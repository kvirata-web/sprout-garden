# Grove Enhancements — Design Spec
**Date:** 2026-03-17
**Status:** Approved
**Scope:** Four enhancements to Grove v2 — Google SSO, welcome modal update, help panel, role rename

---

## Build Order

Enhancements are implemented in dependency order within a single plan and PR:

1. **E4 — Role Rename** (foundation — cleans up naming before other work)
2. **E1 — Google SSO** (auth change, required by E2)
3. **E2 — Welcome Modal** (depends on E1 for first name)
4. **E3 — Help Panel** (independent — uses Admin role naming from E4)

---

## E4 — Role Rename

### Overview
A pure refactor. No functional changes. Completes the rename started in the previous commit (which updated user-facing display labels). This enhancement renames the underlying code variables and database columns.

### JS Variable Renames (App.jsx)

| Old | New |
|---|---|
| `isGardener` | `isAdmin` |
| `isExcom` | `isApprover` |
| `authUser.isGardener` | `authUser.isAdmin` |
| `authUser.isExcom` | `authUser.isApprover` |

All occurrences throughout App.jsx — permission checks, role badge display, conditional renders, function logic, inline comments.

### Database Migration

File: `supabase/migrations/04-rename-role-columns.sql`

```sql
-- Rename role columns on profiles table
ALTER TABLE profiles RENAME COLUMN is_gardener TO is_admin;
ALTER TABLE profiles RENAME COLUMN is_execom TO is_approver;

-- Add first_name column for Google SSO (used by E1 and E2)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS first_name text;

-- Recreate is_admin() helper to reference renamed column
CREATE OR REPLACE FUNCTION is_admin()
RETURNS boolean AS $$
  SELECT COALESCE(
    (SELECT is_admin FROM profiles WHERE id = auth.uid()),
    false
  );
$$ LANGUAGE sql SECURITY DEFINER;

-- Recreate is_approver() helper to reference renamed column
-- (previously is_execom(), referenced in Nursery review RLS policies)
CREATE OR REPLACE FUNCTION is_approver()
RETURNS boolean AS $$
  SELECT COALESCE(
    (SELECT is_approver FROM profiles WHERE id = auth.uid()),
    false
  );
$$ LANGUAGE sql SECURITY DEFINER;

-- Update the projects RLS policy that calls is_execom()
-- Drop the old policy and recreate it using the new function name
DROP POLICY IF EXISTS "Own or admin update" ON projects;
CREATE POLICY "Own or admin update" ON projects
  FOR UPDATE USING (
    auth.email() = builder_email
    OR is_admin()
    OR is_approver()
  );
```

> **Note:** Any other RLS policies in previous migrations that reference `is_gardener`, `is_execom`, or call `is_execom()` directly must also be updated. Review migrations 01–03 before running migration 04 to confirm all call sites are covered.

### `authUser` Object Shape Update

Add `firstName` field to the `authUser` object populated from the `profiles` row:

```javascript
{
  email: string,
  firstName: string | null,   // NEW — from profiles.first_name
  displayName: string,
  country: "PH" | "TH",
  isAdmin: boolean,           // renamed from isGardener
  isApprover: boolean,        // renamed from isExcom
  hasDismissedWelcome: boolean,
}
```

### CLAUDE.md Updates
- All references to `is_gardener` → `is_admin`
- All references to `is_execom` → `is_approver`
- Role descriptions updated to reflect new naming
- RLS policy examples in Section 10 updated
- `profiles` table schema updated to reflect new column names and `first_name`

### Constraints
- No functional permission changes — same two-role model, same rules
- Do not rename any plant stage names
- Run migration SQL in Supabase dashboard before deploying

---

## E1 — Google SSO

### Overview
Replace the current email/password login with Google OAuth via Supabase Auth. No account creation flow — Google handles identity. Domain validation runs post-OAuth to enforce Sprout-only access.

### Login Screen

Minimal centered card layout:

```
┌─────────────────────────────────┐
│                                 │
│         🌿  Grove               │
│   Sprout's AI project tracker   │
│                                 │
│  ┌─────────────────────────┐    │
│  │  G  Sign in with Google │    │
│  └─────────────────────────┘    │
│                                 │
│  @sprout.ph and @sproutsolutions  │
│  .io accounts only              │
│                                 │
└─────────────────────────────────┘
```

- Grove icon (green rounded square) + wordmark
- Short tagline: "Sprout's AI project tracker"
- Single Google button (white, bordered, Google logo, standard style)
- Domain hint below button
- No sign-up tab, no password field, no reset password link

### Auth Flow

1. User clicks "Sign in with Google"
2. `supabase.auth.signInWithOAuth({ provider: 'google' })` opens Google OAuth popup
3. On callback, `onAuthStateChange` fires with session
4. **Immediately set a loading/validating state** — do not render the authenticated app or trigger any data loads until domain validation passes. Show a full-screen loading indicator.
5. Domain validation runs on `session.user.email`:
   - `@sprout.ph` → `country = "PH"` ✅ — proceed to step 6
   - `@sproutsolutions.io` → `country = "TH"` ✅ — proceed to step 6
   - Any other domain → call `supabase.auth.signOut()`, clear loading state, show error: *"Only @sprout.ph and @sproutsolutions.io accounts can access Grove."* — stop here
6. **First login** (no existing `profiles` row): create row with:
   - `country` from email domain
   - `first_name` from `user_metadata.full_name?.split(' ')[0]` or `user_metadata.name?.split(' ')[0]` (null if neither is present)
   - `is_admin = false`, `is_approver = false` (defaults)
7. **Subsequent login** (existing `profiles` row): load row, update `first_name` if it was previously null and is now available from Google metadata
8. Set `authUser` with full profile data. Clear loading state. Render the authenticated app.

> **Domain validation timing:** The loading state in step 4 prevents any part of the authenticated UI from rendering before domain validation completes. This eliminates the race condition where a non-Sprout user briefly sees the app before being signed out.

### What Is Removed
- `handleLogin()` function
- `handleSignUp()` function
- `handleReset()` function
- `handleUpdatePassword()` function
- All email/password form state: `loginEmail`, `loginPassword`, `authMode` (login/signup/reset), `passwordRecovery`, form validation logic
- Sign-up and reset password UI views
- `PASSWORD_RECOVERY` event branch in `onAuthStateChange` — becomes dead code with Google SSO (no password resets possible). Remove the entire `if (event === 'PASSWORD_RECOVERY')` block.

### What Is Kept
- `onAuthStateChange` subscription and session loading logic
- `handleLogout()`
- Domain → country mapping (`COUNTRY_MAP`)
- All role loading from `profiles` table
- Fallback timeout (5-second unblock) — still needed in case `onAuthStateChange` never fires

### Supabase Setup (one-time, manual — before deploy)
1. Supabase dashboard → Authentication → Providers → Google → Enable
2. Add Google OAuth Client ID and Client Secret (from Google Cloud Console)
3. Set authorized redirect URI in Google Cloud Console: `https://<your-project-ref>.supabase.co/auth/v1/callback`
4. Add the same redirect URI in Supabase dashboard under "Redirect URLs"

---

## E2 — Welcome Modal Update

### Overview
Update the first-time welcome modal to greet the user by first name (from Google profile via `authUser.firstName`), replace any remaining "Wishlist" copy with "Seeds", and add a third action card visible only to Approvers.

### Greeting
- Heading: `"Welcome, [firstName]!"` where `firstName` = `authUser.firstName`
- Fallback (if `authUser.firstName` is null or empty): `"Welcome to Grove"`

### Copy Updates
- Any instance of "Wishlist" in the modal body → "Seeds"

### Action Cards

Three cards total. Third card is conditionally rendered for Approvers only.

| | Card 1 | Card 2 | Card 3 |
|---|---|---|---|
| **Label** | — | — | IN THE NURSERY |
| **Title** | Plant a Seed | Add to the Garden | Review plants |
| **Body** | Submit an AI idea you think Sprout needs | Log an AI tool you're building or already shipped | You have plants waiting for your decision. Don't leave builders hanging. |
| **Visible to** | All users | All users | `authUser.isApprover === true` only |
| **On click** | Opens Seed submission flow | Opens Add Plant modal | Dismisses modal + sets active tab to `garden` (Board view where Nursery column lives) |

> **Card 3 navigation:** "Board tab" in the app corresponds to the `garden` tab. Clicking Card 3 dismisses the modal and sets `activeTab = 'garden'`. No stage filter is applied — the Nursery column is always visible on the Board.

### Dismissal Logic (unchanged)
- "Start exploring" button → sets `welcomeSeen = true` (session only, not persisted)
- "Got it, don't show again" button → sets `has_dismissed_welcome = true` in DB via profiles update
- **Auto-dismiss** fires when user submits their first Seed or adds their first Plant

### Visual Style
Unchanged — warm green, existing card and modal styles.

---

## E3 — Help Panel

### Overview
A persistent help feature allowing any logged-in user to submit bug reports or questions. All submissions are visible to everyone. Admins (`isAdmin === true`) can mark items resolved/answered or delete them.

### Entry Point — FAB
- Fixed position: bottom-right corner, `bottom: 20px`, `right: 20px`
- Size: 40×40px, `border-radius: 50%`
- Background: kangkong-700 (`#1B5E20`), hover: kangkong-800 (`#144D18`), hover scale: 1.05
- Icon: question mark (Phosphor `ph:question`), 18×18px, white fill
- Shadow: `0 2px 8px rgba(0,0,0,0.18)`
- Z-index: above all page content, below panel overlay
- Click: opens/closes the Help panel

### Panel
- Width: 320px, height: 100vh
- Background: white (`#FFFFFF`), left border: `1px solid #DDDBD5`
- Animation: `translateX(100%) → translateX(0)`, 220ms `cubic-bezier(0.4,0,0.2,1)`
- Overlay — does not push page content
- Close: ✕ button (top-right of panel) or clicking FAB again

### Panel Header (always visible)
- "Help" title — 15px, weight 600, mushroom-900
- ✕ close button — 28×28px, border-radius 6px, hover: mushroom-200 bg
- Action row: `+ Report` and `+ Ask` buttons side by side, equal width
  - `+ Report` hover: tomato-100 bg, tomato-700 text, `#FFCCBC` border
  - `+ Ask` hover: blueberry-100 bg, blueberry-700 text, `#BBDEFB` border
- Filter tabs: All · Reports · Asks — active state: underline in kangkong-600, 12px font

### Feed View (default state)

Items sorted newest first. **10 items per page.**

**Empty state:** When no items exist (zero records, or zero matching the active filter), show a centered message inside the feed area:
- Icon: question mark or speech bubble (mushroom-300)
- Text: "Nothing here yet." (mushroom-500, 13px)
- Sub-text: "Be the first to submit a report or ask a question." (mushroom-400, 12px)
- Pagination row is hidden when there are no items

**Feed item anatomy:**
```
● Title of the report or question
Name · Date ago                    [↑ N]  [status]
```

| Field | Detail |
|---|---|
| Type dot | 5×5px circle. Tomato-600 = Report · Blueberry-600 = Ask |
| Title | 13px, weight 500, mushroom-900 |
| Submitter | First name from `profiles` (or email prefix if no name). 11px, mushroom-500 |
| Date | Relative: Today / Yesterday / X days ago. 11px, mushroom-500 |
| Upvote | Arrow icon + count. One vote per user, cannot vote own item. Voted state: kangkong-50 bg + kangkong-700 text |
| Status pill | See status table below |

**Status states:**

| Status | Pill bg | Pill text | Feed opacity |
|---|---|---|---|
| open | mango-100 | mango-700 | 100% |
| unanswered | mango-100 | mango-700 | 100% |
| resolved | kangkong-100 | kangkong-700 | 50% |
| answered | kangkong-100 | kangkong-700 | 50% |

Resolved/answered items remain in the feed — never hidden or deleted.

**Pagination:**
- Prev / Next buttons at panel footer, 11px, border: `1px mushroom-200`
- Page indicator: "X of Y" centered, 11px mushroom-500
- Prev disabled on page 1, Next disabled on last page
- Pagination row is hidden when total items ≤ 10 (single page)

### Submit View
Triggered by `+ Report` or `+ Ask`. Replaces feed content within the panel; header remains visible; filter tabs and action row hidden during submission.

| Element | Detail |
|---|---|
| Back button | Arrow + "Back to Help", 12px mushroom-500 |
| View heading | "Submit a report" or "Ask a question" — 14px, weight 600 |
| Type toggle | Report / Ask, pre-selected from triggering button |
| Submitter strip | Avatar initials + "Submitting as [Name]" — mushroom-50 bg, mushroom-200 border |
| Title field | Required. Placeholder: "Brief description..." |
| Description field | Optional textarea. Placeholder: "Steps to reproduce, or more context..." |
| Submit button | Full width, kangkong-700 bg, white text, hover: kangkong-800 |

**Validation:** Title required — submit button is disabled if title is empty. Description optional.

**On submit:** Record created → panel returns to feed → filter resets to All → page resets to 1 → new item appears at top.

### Edit
- Submitters can edit their own item while `status IN ('open', 'unanswered')`
- Opens same submit form pre-filled with existing title and description
- Locked (edit button hidden) once an Admin marks it resolved/answered
- Submitter, type, and `created_at` are not editable

### Admin Actions (`isAdmin === true` only)
| Action | Trigger | Result |
|---|---|---|
| Mark as Resolved | Button on Report items | status → `resolved`, `resolved_by` + `resolved_at` recorded, item opacity 50% |
| Mark as Answered | Button on Ask items | status → `answered`, same fields recorded |
| Delete | Button on any item | Hard delete from DB, item removed from feed immediately |

No re-open action in v1.

### Database — `help_items` Table

| Column | Type | Notes |
|---|---|---|
| `id` | uuid | Primary key, auto-generated |
| `type` | text | `'report'` or `'ask'` |
| `title` | text, not null | Required |
| `description` | text, nullable | Optional |
| `submitted_by` | text | Email from session, auto-filled |
| `created_at` | timestamptz | Auto on insert |
| `updated_at` | timestamptz | Auto on update |
| `status` | text | `'open'`/`'resolved'` (reports) · `'unanswered'`/`'answered'` (asks) |
| `resolved_by` | text, nullable | Email of Admin who resolved/answered |
| `resolved_at` | timestamptz, nullable | Timestamp of resolution |
| `upvoters` | text[] | Array of emails. Same pattern as `wishes.upvoters` |

### RLS Policies for `help_items`

```sql
-- Enable RLS
ALTER TABLE help_items ENABLE ROW LEVEL SECURITY;

-- All authenticated users can read
CREATE POLICY "Authenticated read" ON help_items
  FOR SELECT USING (auth.role() = 'authenticated');

-- Authenticated users can insert their own items
CREATE POLICY "Own insert" ON help_items
  FOR INSERT WITH CHECK (
    auth.role() = 'authenticated'
    AND submitted_by = auth.email()
  );

-- Submitters can update title/description while item is open/unanswered
CREATE POLICY "Submitter edit while open" ON help_items
  FOR UPDATE USING (
    submitted_by = auth.email()
    AND status IN ('open', 'unanswered')
  );

-- Admins can update any field (status, resolved_by, resolved_at, upvoters)
CREATE POLICY "Admin update" ON help_items
  FOR UPDATE USING (is_admin());

-- Admins can delete
CREATE POLICY "Admin delete" ON help_items
  FOR DELETE USING (is_admin());
```

> **Column-level security note:** Supabase RLS applies row-level restrictions only — it cannot restrict which columns a user may write within a single UPDATE. For v1, column integrity (e.g., preventing a submitter from changing `status`) is enforced in the React UI. The UI never sends `status` in a submitter's UPDATE payload. An Admin's separate UPDATE policy covers status changes. This is the same pattern used for `wishes.upvoters` in the existing app.

> **Upvote enforcement note:** "Cannot upvote own item" is enforced in the React UI (button disabled when `submitted_by === authUser.email`). The RLS `upvoters` update policy cannot inspect array contents without a custom function. UI enforcement is sufficient for v1 — same pattern as wishes.

### Design Tokens Reference

> **Implementation note:** Use the DS constant object values defined in App.jsx (e.g., `C.kangkong700`, `C.tomato600`), not hardcoded hex. The hex values below are for reference only and may not exactly match DS constants. Where a token listed below does not exist in the DS object, use the nearest available constant as noted.

| Element | DS Token | Nearest DS constant | Note |
|---|---|---|---|
| FAB background | kangkong-700 | `C.kangkong700` | |
| FAB hover | kangkong-800 | `C.kangkong800` | |
| Panel background | white | `#FFFFFF` | |
| Panel border | mushroom-200 | `C.mushroom200` | |
| Report type dot | tomato-600 | `C.tomato600` | |
| Report button/text hover | tomato-700 | `C.tomato600` | `tomato700` not in DS — use `tomato600` |
| Report hover bg | tomato-100 | `C.tomato100` | |
| Ask type dot | blueberry-500 | `C.blueberry500` | `blueberry600` not in DS — use `blueberry500` |
| Ask button/text hover | blueberry-500 | `C.blueberry500` | `blueberry700` not in DS — use `blueberry500` |
| Ask hover bg | blueberry-100 | `C.blueberry100` | |
| Open/unanswered pill bg | mango-100 | `C.mango100` | |
| Open/unanswered pill text | mango-700 | `C.mango700` | |
| Resolved/answered pill bg | kangkong-100 | `C.kangkong100` | |
| Resolved/answered pill text | kangkong-700 | `C.kangkong700` | |
| Upvote voted bg | kangkong-50 | `C.kangkong50` | |
| Submit button | kangkong-700 | `C.kangkong700` | |

### Hard Constraints
- No localStorage or sessionStorage
- No notifications in v1
- No threading or comments — each item is standalone
- No linking to Plants or Seeds
- No re-open action in v1
- Submitter always auto-filled — never a manual input
- Upvoting own item not allowed — enforced in UI (RLS cannot enforce array membership without a custom function; UI enforcement is sufficient for v1)

---

## Open Items (not in scope for this release)

- Google provider setup in Supabase dashboard (manual step before deploy — see E1 Supabase Setup section)
- DB migration `04-rename-role-columns.sql` must be run before deploying
- Help panel v2 backlog: re-open action, Admin reply to Ask, notifications, Admin dashboard, search
