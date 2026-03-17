# Grove Enhancements Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement four Grove enhancements — role rename (E4), Google SSO login (E1), welcome modal update (E2), and a persistent Help panel (E3) — in dependency order as a single PR.

**Architecture:** All product code lives in `src/App.jsx` (single ~4300-line React file). Two new Supabase migration SQL files. CLAUDE.md documentation update. Build order is E4 → E1 → E2 → E3: the rename creates a clean foundation, SSO builds on it, the modal uses the first name SSO provides, and the Help panel is independent but uses the renamed role constants.

**Tech Stack:** React + Vite, Supabase Auth (OAuth) + Supabase DB (Postgres), inline styles using DS token constants (`C.kangkongXXX` etc.), no external icon library (custom inline SVG components).

**Spec:** `docs/superpowers/specs/2026-03-17-grove-enhancements-design.md`

---

## Chunk 1: E4 — Role Rename

### Task 1: Create migration 04-rename-role-columns.sql

**Files:**
- Create: `supabase/migrations/04-rename-role-columns.sql`

- [ ] **Step 1: Create the migration file**

```sql
-- supabase/migrations/04-rename-role-columns.sql
-- Rename role columns on profiles table
ALTER TABLE profiles RENAME COLUMN is_gardener TO is_admin;
ALTER TABLE profiles RENAME COLUMN is_execom TO is_approver;

-- Add first_name column (used by E1 Google SSO and E2 welcome modal)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS first_name text;

-- Recreate is_admin() helper to reference renamed column
CREATE OR REPLACE FUNCTION is_admin()
RETURNS boolean AS $$
  SELECT COALESCE(
    (SELECT is_admin FROM profiles WHERE id = auth.uid()),
    false
  );
$$ LANGUAGE sql SECURITY DEFINER;

-- Recreate is_approver() helper (previously is_execom())
-- Referenced in Nursery review RLS policies
CREATE OR REPLACE FUNCTION is_approver()
RETURNS boolean AS $$
  SELECT COALESCE(
    (SELECT is_approver FROM profiles WHERE id = auth.uid()),
    false
  );
$$ LANGUAGE sql SECURITY DEFINER;

-- Update the projects RLS policy that called is_execom()
-- (Policy "Own or admin update" was created in migration 03)
DROP POLICY IF EXISTS "Own or admin update" ON projects;
CREATE POLICY "Own or admin update" ON projects
  FOR UPDATE USING (
    auth.email() = builder_email
    OR is_admin()
    OR is_approver()
  );
```

> **Before running:** Open `supabase/migrations/03-execom-notifications-rls.sql` and confirm it doesn't define any other policies or functions referencing `is_gardener`, `is_execom`, or `is_execom()` beyond what migration 04 already covers. If it does, add matching DROP/CREATE statements to migration 04.

- [ ] **Step 2: Run migration in Supabase dashboard**

Go to Supabase dashboard → SQL Editor → paste the entire file → Run.
Expected: no errors. Verify in Table Editor that `profiles` now has columns `is_admin`, `is_approver`, `first_name`.

---

### Task 2: Rename isGardener → isAdmin throughout App.jsx

**Files:**
- Modify: `src/App.jsx`

The following lines contain `isGardener` and must be updated. Search for `isGardener` to confirm no others exist.

- [ ] **Step 1: Update fallback auth object (line ~3761)**

Find:
```javascript
const fallback    = { email: session.user.email, displayName, country, isGardener: false, isExcom: false };
```
Replace with:
```javascript
const fallback    = { email: session.user.email, firstName: null, displayName, country, isAdmin: false, isApprover: false, hasDismissedWelcome: false };
```

- [ ] **Step 2: Update DB profile sync (line ~3769)**

Find:
```javascript
setAuthUser({ email: existing.email, displayName: existing.display_name, country: existing.country, isGardener: existing.is_gardener, isExcom: existing.is_execom || false, hasDismissedWelcome: existing.has_dismissed_welcome || false });
```
Replace with:
```javascript
setAuthUser({ email: existing.email, firstName: existing.first_name || null, displayName: existing.display_name, country: existing.country, isAdmin: existing.is_admin || false, isApprover: existing.is_approver || false, hasDismissedWelcome: existing.has_dismissed_welcome || false });
```

- [ ] **Step 3: Update profile insert on first login (line ~3771-3774)**

Find:
```javascript
supabase.from("profiles").insert({
  id: session.user.id, email: session.user.email,
  display_name: displayName, country, is_gardener: false,
}).catch(e => console.warn("Profile insert error:", e));
```
Replace with:
```javascript
supabase.from("profiles").insert({
  id: session.user.id, email: session.user.email,
  display_name: displayName, first_name: null, country, is_admin: false, is_approver: false,
}).catch(e => console.warn("Profile insert error:", e));
```

- [ ] **Step 4: Update stage change permission check (line ~3903)**

Find:
```javascript
if (!authUser || (authUser.email !== project.builderEmail && !authUser.isGardener)) return;
```
Replace with:
```javascript
if (!authUser || (authUser.email !== project.builderEmail && !authUser.isAdmin)) return;
```

- [ ] **Step 5: Update nursery exit restriction (line ~3918)**

Find:
```javascript
if (project.stage === 'nursery' && !authUser.isGardener) return;
```
Replace with:
```javascript
if (project.stage === 'nursery' && !authUser.isAdmin) return;
```

- [ ] **Step 6: Update adjacent-stage rule (line ~3921)**

Find:
```javascript
if (!authUser.isGardener) {
```
Replace with:
```javascript
if (!authUser.isAdmin) {
```

- [ ] **Step 7: Update unclaim permission (line ~4118)**

Find:
```javascript
if (authUser.email !== wish.claimedByEmail && !authUser.isGardener) return;
```
Replace with:
```javascript
if (authUser.email !== wish.claimedByEmail && !authUser.isAdmin) return;
```

- [ ] **Step 8: Update nav role badge (line ~4262)**

Find:
```javascript
{authUser.isGardener&&<span style={{...}}>Admin</span>}
```
Replace `authUser.isGardener` with `authUser.isAdmin`. (The display text "Admin" is already correct from the previous commit — only the condition variable changes.)

- [ ] **Step 9: Update edit permission check (line ~1991-1992)**

Find:
```javascript
{(authUser?.email===project.builderEmail||authUser?.isGardener) &&
  !(project.reviewStatus==='pending' && !authUser?.isGardener) && (
```
Replace both `isGardener` with `isAdmin`.

- [ ] **Step 10: Update wish detail panel local variable (line ~1199)**

Find:
```javascript
const isGardener = authUser?.isGardener;
```
Replace with:
```javascript
const isAdmin = authUser?.isAdmin;
```
Then update all uses of `isGardener` within that component to `isAdmin` (lines ~1211, ~1256).

- [ ] **Step 11: Update seedling submission check (line ~2042)**

Find:
```javascript
{project.stage==="seedling" && (authUser?.email===project.builderEmail||authUser?.isGardener) && (
```
Replace `isGardener` with `isAdmin`.

- [ ] **Step 12: Update withdraw-from-nursery check (line ~2157)**

Find:
```javascript
{(authUser?.email===project.builderEmail||authUser?.isGardener)&&(
```
Replace `isGardener` with `isAdmin`.

- [ ] **Step 13: Update profile modal badge (line ~3203)**

Find:
```javascript
{authUser.isGardener&&(
```
Replace with:
```javascript
{authUser.isAdmin&&(
```

- [ ] **Step 14: Remove demo user objects (lines ~3362, 3370, 3378)**

Search for `isGardener: false` and `isGardener: true` — these are in demo/seed user objects. Update to `isAdmin: false` / `isAdmin: true` as appropriate, also renaming `isExcom` → `isApprover` in the same objects.

- [ ] **Step 15: Verify no isGardener remains**

Search the file for `isGardener`. Expected: zero matches.

---

### Task 3: Rename isExcom → isApprover throughout App.jsx

- [ ] **Step 1: Update nav role badge (line ~4263)**

Find:
```javascript
{authUser.isExcom&&<span style={{...}}>Approver</span>}
```
Replace `authUser.isExcom` with `authUser.isApprover`.

- [ ] **Step 2: Update ExCom decision zone visibility (line ~2125)**

Find:
```javascript
{authUser?.isExcom && (
```
Replace with:
```javascript
{authUser?.isApprover && (
```

- [ ] **Step 3: Update inverse ExCom check (line ~2120)**

Find:
```javascript
{!authUser?.isExcom && (
```
Replace with:
```javascript
{!authUser?.isApprover && (
```

- [ ] **Step 4: Update notification trigger (line ~1972)**

Find:
```javascript
if (project.stage === 'nursery' && authUser?.isExcom) {
```
Replace with:
```javascript
if (project.stage === 'nursery' && authUser?.isApprover) {
```

- [ ] **Step 5: Verify no isExcom remains**

Search the file for `isExcom`. Expected: zero matches.

---

### Task 4: Update CLAUDE.md

**Files:**
- Modify: `CLAUDE.md`

- [ ] **Step 1: Update profiles table schema in Section 5**

Find all `is_gardener` references → replace with `is_admin`.
Find all `is_execom` references → replace with `is_approver`.
Add `first_name text` to the profiles schema description.

- [ ] **Step 2: Update RLS policy examples in Section 10**

Find:
```sql
create policy "Own or admin update" on projects for update
  using (auth.email() = builder_email OR is_admin());
```
Update to include `is_approver()` for Nursery-related policies. Update the `is_admin()` function body to reference the renamed `is_admin` column.

- [ ] **Step 3: Update role descriptions in Section 4**

Update any remaining `is_gardener`/`is_execom` field references in the permissions tables.

---

### Task 5: Commit E4

- [ ] **Step 1: Run dev server and verify the app loads**

```bash
npm run dev
```
Open http://localhost:5173. Confirm app loads without console errors. (Auth will still work — Supabase session uses the same user, just new column names in DB.)

- [ ] **Step 2: Commit**

```bash
git add src/App.jsx CLAUDE.md supabase/migrations/04-rename-role-columns.sql
git commit -m "refactor(E4): rename isGardener→isAdmin, isExcom→isApprover throughout — code, DB migration, CLAUDE.md"
```

---

## Chunk 2: E1 — Google SSO

### Task 6: Add Google sign-in handler and rewrite onAuthStateChange

**Files:**
- Modify: `src/App.jsx:3740-3780` (onAuthStateChange), `src/App.jsx:3736-3738` (state vars)

- [ ] **Step 1: Add `handleGoogleSignIn` after `handleLogout` (after line ~3825)**

Insert after the `handleLogout` function:

```javascript
const handleGoogleSignIn = async () => {
  setAuthError("");
  setAuthLoading(true);
  const { error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo: window.location.origin },
  });
  // If error (e.g. provider not enabled), surface it and unblock
  if (error) {
    setAuthError(error.message);
    setAuthLoading(false);
  }
  // On success the browser redirects — authLoading stays true until
  // onAuthStateChange fires after the OAuth callback
};
```

- [ ] **Step 2: Rewrite onAuthStateChange (lines 3740-3780)**

Replace the entire `useEffect` block (lines 3740-3780) with:

```javascript
useEffect(() => {
  // Fallback: if onAuthStateChange never fires (e.g. missing env vars), unblock after 5s
  const timeout = setTimeout(() => setAuthLoading(false), 5000);

  const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
    clearTimeout(timeout);

    if (!session) {
      setAuthUser(null);
      setAuthLoading(false);
      setAuthError("");
      return;
    }

    // Keep loading state — do not render the app until domain validation passes
    const email  = session.user.email;
    const domain = email.split("@")[1];
    const country = COUNTRY_MAP[domain];

    if (!country) {
      // Non-Sprout account — sign out and show error
      await supabase.auth.signOut();
      setAuthError("Only @sprout.ph and @sproutsolutions.io accounts can access Grove.");
      setAuthLoading(false);
      return;
    }

    // Extract first name from Google user metadata
    const meta      = session.user.user_metadata || {};
    const firstName = meta.full_name?.split(" ")[0] || meta.name?.split(" ")[0] || null;

    try {
      const { data: existing } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", session.user.id)
        .maybeSingle();

      if (existing) {
        // Update first_name if it was previously null and Google now provides it
        if (!existing.first_name && firstName) {
          await supabase.from("profiles").update({ first_name: firstName }).eq("id", session.user.id);
        }
        setAuthUser({
          email: existing.email,
          firstName: existing.first_name || firstName || null,
          displayName: existing.display_name || email.split("@")[0],
          country: existing.country,
          isAdmin: existing.is_admin || false,
          isApprover: existing.is_approver || false,
          hasDismissedWelcome: existing.has_dismissed_welcome || false,
        });
      } else {
        // First login — create profile row
        const displayName = email.split("@")[0];
        await supabase.from("profiles").insert({
          id: session.user.id,
          email,
          display_name: displayName,
          first_name: firstName,
          country,
          is_admin: false,
          is_approver: false,
          has_dismissed_welcome: false,
        });
        setAuthUser({
          email,
          firstName: firstName || null,
          displayName,
          country,
          isAdmin: false,
          isApprover: false,
          hasDismissedWelcome: false,
        });
      }
    } catch (e) {
      console.warn("Profile load/create error:", e);
      // Fallback: still allow access with minimal profile
      setAuthUser({
        email,
        firstName: firstName || null,
        displayName: email.split("@")[0],
        country,
        isAdmin: false,
        isApprover: false,
        hasDismissedWelcome: false,
      });
    }

    setAuthLoading(false);
  });

  return () => subscription.unsubscribe();
}, []);
```

- [ ] **Step 3: Remove `passwordRecovery` state variable (line ~3738)**

Find:
```javascript
const [passwordRecovery, setPasswordRecovery] = useState(false);
```
Delete this line.

---

### Task 7: Replace login screen UI

**Files:**
- Modify: `src/App.jsx:4166-4177` (login gate render)

- [ ] **Step 1: Replace the `!authUser` render block (lines 4166-4177)**

Find:
```javascript
  if (!authUser) {
    return (
      <>
        <LoginScreen onLogin={handleLogin} onSignUp={handleSignUp} onReset={handleReset} onUpdatePassword={handleUpdatePassword} initialMode={passwordRecovery ? "newpassword" : "login"} error={authError} loading={authLoading}/>
        <style>{`
          @import url('https://fonts.googleapis.com/css2?family=Rubik:wght@400;500;600;700;800&family=Roboto+Mono&display=swap');
          @keyframes slideUp{from{transform:translateY(30px);opacity:0}to{transform:translateY(0);opacity:1}}
          * { box-sizing:border-box; }
        `}</style>
      </>
    );
  }
```

Replace with:

```javascript
  if (!authUser) {
    return (
      <>
        <div style={{minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center",background:"linear-gradient(135deg,"+C.kangkong800+" 0%,"+C.kangkong400+" 100%)"}}>
          <div style={{background:C.white,borderRadius:DS.radius.xl,padding:"40px 32px",width:340,boxShadow:DS.shadow.xl,display:"flex",flexDirection:"column",alignItems:"center",gap:20}}>
            {/* Grove mark */}
            <div style={{display:"flex",alignItems:"center",gap:10}}>
              <div style={{width:36,height:36,background:C.kangkong600,borderRadius:DS.radius.md,display:"flex",alignItems:"center",justifyContent:"center",fontSize:20}}>🌿</div>
              <span style={{fontFamily:FF,fontSize:22,fontWeight:800,color:C.mushroom900,letterSpacing:"-0.02em"}}>Grove</span>
            </div>
            <div style={{fontFamily:FF,fontSize:13,color:C.mushroom500,textAlign:"center"}}>Sprout's AI project tracker</div>
            {/* Error message */}
            {authError && (
              <div style={{width:"100%",background:C.tomato100,border:"1px solid #FFCDD2",borderRadius:DS.radius.sm,padding:"8px 12px",fontFamily:FF,fontSize:12,color:C.tomato600,textAlign:"center"}}>
                {authError}
              </div>
            )}
            {/* Google sign-in button */}
            <button
              onClick={handleGoogleSignIn}
              disabled={authLoading}
              style={{width:"100%",display:"flex",alignItems:"center",justifyContent:"center",gap:10,background:C.white,border:"1px solid "+C.mushroom200,borderRadius:DS.radius.md,padding:"10px 20px",fontFamily:FF,fontSize:13,fontWeight:500,color:C.mushroom900,cursor:"pointer",boxShadow:DS.shadow.sm,opacity:authLoading?0.6:1}}
            >
              {/* Google logo SVG */}
              <svg width="18" height="18" viewBox="0 0 18 18">
                <path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.874 2.684-6.615z"/>
                <path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332C2.438 15.983 5.482 18 9 18z"/>
                <path fill="#FBBC05" d="M3.964 10.71c-.18-.54-.282-1.117-.282-1.71s.102-1.17.282-1.71V4.958H.957C.347 6.173 0 7.548 0 9s.348 2.827.957 4.042l3.007-2.332z"/>
                <path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0 5.482 0 2.438 2.017.957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z"/>
              </svg>
              {authLoading ? "Signing in…" : "Sign in with Google"}
            </button>
            <div style={{fontFamily:FF,fontSize:11,color:C.mushroom400,textAlign:"center"}}>
              @sprout.ph and @sproutsolutions.io accounts only
            </div>
          </div>
        </div>
        <style>{`
          @import url('https://fonts.googleapis.com/css2?family=Rubik:wght@400;500;600;700;800&family=Roboto+Mono&display=swap');
          @keyframes slideUp{from{transform:translateY(30px);opacity:0}to{transform:translateY(0);opacity:1}}
          * { box-sizing:border-box; }
        `}</style>
      </>
    );
  }
```

---

### Task 8: Remove email/password functions and state

**Files:**
- Modify: `src/App.jsx`

- [ ] **Step 1: Delete handleLogin (lines 3782-3794)**

Delete the entire function:
```javascript
const handleLogin = async (email, password) => { ... };
```

- [ ] **Step 2: Delete handleSignUp (lines 3796-3808)**

Delete the entire function:
```javascript
const handleSignUp = async (email, password) => { ... };
```

- [ ] **Step 3: Delete handleReset (lines 3810-3814)**

Delete the entire function:
```javascript
const handleReset = async (email) => { ... };
```

- [ ] **Step 4: Delete handleUpdatePassword (lines 3816-3821)**

Delete the entire function:
```javascript
const handleUpdatePassword = async (newPassword) => { ... };
```

- [ ] **Step 5: Delete the LoginScreen component definition (line ~3413)**

Search for `function LoginScreen(` — the function definition starts at line ~3413. The call site was removed in Task 7. Delete the entire `LoginScreen` function body (it is ~80 lines). Verify no remaining references to `LoginScreen` exist.

```
Search: function LoginScreen(
Expected: found once (the definition). Delete from that line to its closing `}`.
```

---

### Task 9: Verify E1 and commit

- [ ] **Step 1: Supabase setup — Google provider**

Before testing locally, confirm Google OAuth is enabled in Supabase:
1. Supabase dashboard → Authentication → Providers → Google → Enable
2. Enter Google OAuth Client ID and Client Secret (from Google Cloud Console OAuth credentials)
3. In Google Cloud Console → OAuth consent screen → Authorized redirect URIs: add `https://<project-ref>.supabase.co/auth/v1/callback` AND `http://localhost:5173` (for local dev)
4. In Supabase dashboard → Authentication → URL Configuration → Redirect URLs: add `http://localhost:5173`

- [ ] **Step 2: Run dev server and test**

```bash
npm run dev
```

Test cases:
1. Open http://localhost:5173 → login screen shows Grove mark + Google button (no email/password fields)
2. Click "Sign in with Google" with a non-Sprout Google account → error message appears, no app access
3. Click "Sign in with Google" with a `@sprout.ph` account → app loads, country badge shows "PH"
4. Hard refresh → session persists, no re-login required
5. Click "Sign Out" → returns to login screen

- [ ] **Step 3: Commit**

```bash
git add src/App.jsx
git commit -m "feat(E1): replace email/password auth with Google SSO — domain validation, first name extraction"
```

---

## Chunk 3: E2 — Welcome Modal Update

### Task 10: Update WelcomeModal component

**Files:**
- Modify: `src/App.jsx:2661-2716` (WelcomeModal function)

- [ ] **Step 1: Update WelcomeModal signature and content**

Find the entire `WelcomeModal` function (starting at line ~2661):
```javascript
function WelcomeModal({onExplore, onDismissPermanently, onPlantSeed, onAddToGarden}) {
```

Replace the entire function with:

```javascript
function WelcomeModal({onExplore, onDismissPermanently, onPlantSeed, onAddToGarden, onReviewNursery, firstName, isApprover}) {
  const greeting = firstName ? `Welcome, ${firstName}!` : "Welcome to Grove";
  return (
    <div style={{position:"fixed",inset:0,zIndex:60,display:"flex",alignItems:"center",justifyContent:"center",background:"rgba(32,30,24,0.6)",backdropFilter:"blur(8px)"}}>
      <div style={{background:C.white,borderRadius:DS.radius.xl,padding:36,maxWidth:480,width:"92%",boxShadow:DS.shadow.xl,border:"1px solid "+C.mushroom200,animation:"slideUp 0.35s cubic-bezier(0.34,1.2,0.64,1)"}}>
        {/* Header */}
        <div style={{textAlign:"center",marginBottom:24}}>
          <div style={{fontSize:36,marginBottom:12,lineHeight:1}}>🌿</div>
          <div style={{fontFamily:FF,fontSize:22,fontWeight:800,color:C.mushroom900,marginBottom:8}}>{greeting}</div>
          <div style={{fontFamily:FF,fontSize:14,color:C.mushroom600,lineHeight:1.6}}>
            AI tools are being built across Sprout — but no one knows what exists. Grove fixes that.
          </div>
        </div>
        {/* Action cards */}
        <div style={{display:"flex",flexDirection:"column",gap:10,marginBottom:28}}>
          {/* Card 1: Plant a Seed */}
          <button onClick={onPlantSeed} style={{background:C.kangkong50,border:"1.5px solid "+C.kangkong200,borderRadius:DS.radius.lg,padding:"14px 16px",display:"flex",gap:12,alignItems:"flex-start",cursor:"pointer",textAlign:"left",transition:"all 0.15s",width:"100%"}}
            onMouseOver={e=>{e.currentTarget.style.background=C.kangkong100;e.currentTarget.style.borderColor=C.kangkong400;}}
            onMouseOut={e=>{e.currentTarget.style.background=C.kangkong50;e.currentTarget.style.borderColor=C.kangkong200;}}
          >
            <span style={{fontSize:20,lineHeight:1,flexShrink:0,marginTop:1}}>🌱</span>
            <div>
              <div style={{fontFamily:FF,fontSize:13,fontWeight:700,color:C.kangkong700,marginBottom:3}}>Plant a Seed</div>
              <div style={{fontFamily:FF,fontSize:12,color:C.kangkong600,lineHeight:1.55}}>Submit an AI idea you think Sprout needs. The team can vote on it, someone can claim it, and it might get built.</div>
            </div>
          </button>
          {/* Card 2: Add to the Garden */}
          <button onClick={onAddToGarden} style={{background:C.mushroom50,border:"1.5px solid "+C.mushroom200,borderRadius:DS.radius.lg,padding:"14px 16px",display:"flex",gap:12,alignItems:"flex-start",cursor:"pointer",textAlign:"left",transition:"all 0.15s",width:"100%"}}
            onMouseOver={e=>{e.currentTarget.style.background=C.mushroom100;e.currentTarget.style.borderColor=C.mushroom300;}}
            onMouseOut={e=>{e.currentTarget.style.background=C.mushroom50;e.currentTarget.style.borderColor=C.mushroom200;}}
          >
            <span style={{fontSize:20,lineHeight:1,flexShrink:0,marginTop:1}}>🌾</span>
            <div>
              <div style={{fontFamily:FF,fontSize:13,fontWeight:700,color:C.mushroom700,marginBottom:3}}>Add to the Garden</div>
              <div style={{fontFamily:FF,fontSize:12,color:C.mushroom600,lineHeight:1.55}}>Log an AI tool you're building or already shipped. Don't let good work go unseen.</div>
            </div>
          </button>
          {/* Card 3: Review plants — Approver only */}
          {isApprover && (
            <button onClick={onReviewNursery} style={{background:C.mango50,border:"1.5px solid "+C.mango200,borderRadius:DS.radius.lg,padding:"14px 16px",display:"flex",gap:12,alignItems:"flex-start",cursor:"pointer",textAlign:"left",transition:"all 0.15s",width:"100%"}}
              onMouseOver={e=>{e.currentTarget.style.background=C.mango100;e.currentTarget.style.borderColor=C.mango400;}}
              onMouseOut={e=>{e.currentTarget.style.background=C.mango50;e.currentTarget.style.borderColor=C.mango200;}}
            >
              <span style={{fontSize:20,lineHeight:1,flexShrink:0,marginTop:1}}>🌿</span>
              <div>
                <div style={{fontFamily:FF,fontSize:10,fontWeight:700,color:C.mango600,letterSpacing:"0.08em",textTransform:"uppercase",marginBottom:2}}>IN THE NURSERY</div>
                <div style={{fontFamily:FF,fontSize:13,fontWeight:700,color:C.mango700,marginBottom:3}}>Review plants</div>
                <div style={{fontFamily:FF,fontSize:12,color:C.mango600,lineHeight:1.55}}>You have plants waiting for your decision. Don't leave builders hanging.</div>
              </div>
            </button>
          )}
        </div>
        <div style={{fontFamily:FF,fontSize:12,color:C.mushroom500,textAlign:"center",marginBottom:20}}>
          Start by exploring what's already growing — or plant your first seed.
        </div>
        {/* Buttons */}
        <div style={{display:"flex",flexDirection:"column",gap:8}}>
          <button onClick={onExplore} style={{width:"100%",padding:"11px 0",borderRadius:DS.radius.lg,background:C.kangkong500,border:"none",color:C.white,fontFamily:FF,fontSize:14,fontWeight:700,cursor:"pointer",transition:"background 0.15s"}}>
            Start exploring
          </button>
          <button onClick={onDismissPermanently} style={{width:"100%",padding:"10px 0",borderRadius:DS.radius.lg,background:"none",border:"1.5px solid "+C.mushroom200,color:C.mushroom500,fontFamily:FF,fontSize:13,fontWeight:500,cursor:"pointer",transition:"all 0.15s"}}>
            Got it, don't show again
          </button>
        </div>
      </div>
    </div>
  );
}
```

> **DS token note:** `mango50`, `mango200`, `mango400`, `mango600` are used for Card 3. Verify these exist in the DS constants at the top of App.jsx. If `mango200` or `mango400` are missing, use the nearest available mango token (e.g. `mango300` or `mango500`).

---

### Task 11: Update WelcomeModal call site

**Files:**
- Modify: `src/App.jsx:4344-4350`

- [ ] **Step 1: Add new props to WelcomeModal call (lines 4344-4350)**

Find:
```javascript
      {authUser && !authUser.hasDismissedWelcome && !welcomeSeen && !dataLoading && (
        <WelcomeModal
          onExplore={() => setWelcomeSeen(true)}
          onDismissPermanently={handleDismissWelcomePermanently}
          onPlantSeed={() => { setWelcomeSeen(true); setView("wishlist"); setShowAddWish(true); }}
          onAddToGarden={() => { setWelcomeSeen(true); setView("garden"); setShowForm(true); }}
        />
      )}
```

Replace with:
```javascript
      {authUser && !authUser.hasDismissedWelcome && !welcomeSeen && !dataLoading && (
        <WelcomeModal
          onExplore={() => setWelcomeSeen(true)}
          onDismissPermanently={handleDismissWelcomePermanently}
          onPlantSeed={() => { setWelcomeSeen(true); setView("wishlist"); setShowAddWish(true); }}
          onAddToGarden={() => { setWelcomeSeen(true); setView("garden"); setShowForm(true); }}
          onReviewNursery={() => { setWelcomeSeen(true); setView("garden"); }}
          firstName={authUser.firstName}
          isApprover={authUser.isApprover}
        />
      )}
```

---

### Task 12: Verify E2 and commit

- [ ] **Step 1: Test in browser**

Test cases:
1. Log in as a regular user → welcome modal shows `"Welcome, [first name]!"` (or `"Welcome to Grove"` if name is null). No third card.
2. Log in as an Approver → modal shows all three cards including "Review plants"
3. Click "Review plants" → modal dismisses and the Garden/Board view opens

- [ ] **Step 2: Commit**

```bash
git add src/App.jsx
git commit -m "feat(E2): personalized welcome modal greeting + Approver nursery card"
```

---

## Chunk 4: E3 — Help Panel

### Task 13: Create migration 05-help-items.sql

**Files:**
- Create: `supabase/migrations/05-help-items.sql`

- [ ] **Step 1: Create the migration file**

```sql
-- supabase/migrations/05-help-items.sql
-- Create help_items table for the Help panel feature

CREATE TABLE IF NOT EXISTS help_items (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type         text NOT NULL CHECK (type IN ('report', 'ask')),
  title        text NOT NULL,
  description  text,
  submitted_by text NOT NULL,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now(),
  status       text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'resolved', 'unanswered', 'answered')),
  resolved_by  text,
  resolved_at  timestamptz,
  upvoters     text[] NOT NULL DEFAULT '{}'
);

-- Auto-update updated_at on row changes (scoped name to avoid conflicts with other tables)
CREATE OR REPLACE FUNCTION help_items_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER help_items_updated_at
  BEFORE UPDATE ON help_items
  FOR EACH ROW EXECUTE FUNCTION help_items_set_updated_at();

-- RLS
ALTER TABLE help_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated read" ON help_items
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Own insert" ON help_items
  FOR INSERT WITH CHECK (
    auth.role() = 'authenticated'
    AND submitted_by = auth.email()
  );

-- Submitters can edit title/description while item is open/unanswered
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

- [ ] **Step 2: Run migration in Supabase dashboard**

SQL Editor → paste file → Run.
Verify `help_items` table appears in Table Editor with correct columns.

---

### Task 14: Add help panel state variables

**Files:**
- Modify: `src/App.jsx` — state declarations section (near other `useState` calls, around line ~3730)

- [ ] **Step 1: Add help panel state**

Find the block of `useState` declarations near the top of the main component. Add these after the existing state variables:

```javascript
// Help panel state
const [helpOpen,        setHelpOpen]        = useState(false);
const [helpItems,       setHelpItems]       = useState([]);
const [helpFilter,      setHelpFilter]      = useState("all"); // "all" | "report" | "ask"
const [helpPage,        setHelpPage]        = useState(1);
const [helpView,        setHelpView]        = useState("feed"); // "feed" | "submit" | "edit"
const [helpSubmitType,  setHelpSubmitType]  = useState("report"); // pre-selected type in submit form
const [helpEditItem,    setHelpEditItem]    = useState(null); // item being edited
const [helpFormTitle,   setHelpFormTitle]   = useState("");
const [helpFormDesc,    setHelpFormDesc]    = useState("");
const [helpLoading,     setHelpLoading]     = useState(false);
```

---

### Task 15: Add loadHelpItems and mutation functions

**Files:**
- Modify: `src/App.jsx` — near other load functions (around `loadProjects`, `loadWishes`)

- [ ] **Step 1: Add loadHelpItems function**

Add after the `loadWishes` function:

```javascript
const loadHelpItems = async () => {
  const { data, error } = await supabase
    .from("help_items")
    .select("*")
    .order("created_at", { ascending: false });
  if (!error && data) setHelpItems(data);
};
```

- [ ] **Step 2: Call loadHelpItems when panel opens**

Find the `handleGoogleSignIn` or data load `useEffect` and add a panel-open trigger. Instead of loading on mount, load when the help panel is first opened.

Wrap the FAB button onClick (Task 16) to load items if not already loaded:

```javascript
const handleHelpOpen = async () => {
  setHelpOpen(true);
  setHelpPage(1);
  setHelpFilter("all");
  setHelpView("feed");
  await loadHelpItems();
};
```

- [ ] **Step 3: Add handleHelpSubmit function**

```javascript
const handleHelpSubmit = async () => {
  if (!helpFormTitle.trim() || !authUser) return;
  setHelpLoading(true);
  const isEdit = helpView === "edit" && helpEditItem;
  if (isEdit) {
    const { error } = await supabase
      .from("help_items")
      .update({ title: helpFormTitle.trim(), description: helpFormDesc.trim() || null })
      .eq("id", helpEditItem.id);
    if (!error) await loadHelpItems();
  } else {
    const newItem = {
      type: helpSubmitType,
      title: helpFormTitle.trim(),
      description: helpFormDesc.trim() || null,
      submitted_by: authUser.email,
      status: helpSubmitType === "report" ? "open" : "unanswered",
    };
    const { error } = await supabase.from("help_items").insert(newItem);
    if (!error) await loadHelpItems();
  }
  setHelpFormTitle("");
  setHelpFormDesc("");
  setHelpEditItem(null);
  setHelpView("feed");
  setHelpFilter("all");
  setHelpPage(1);
  setHelpLoading(false);
};
```

- [ ] **Step 4: Add handleHelpUpvote function**

```javascript
const handleHelpUpvote = async (item) => {
  if (!authUser || item.submitted_by === authUser.email) return;
  const alreadyVoted = item.upvoters?.includes(authUser.email);
  const newUpvoters = alreadyVoted
    ? item.upvoters.filter(e => e !== authUser.email)
    : [...(item.upvoters || []), authUser.email];
  const { error } = await supabase
    .from("help_items")
    .update({ upvoters: newUpvoters })
    .eq("id", item.id);
  if (!error) await loadHelpItems();
};
```

- [ ] **Step 5: Add handleHelpResolve function (Admin only)**

```javascript
const handleHelpResolve = async (item) => {
  if (!authUser?.isAdmin) return;
  const newStatus = item.type === "report" ? "resolved" : "answered";
  const { error } = await supabase
    .from("help_items")
    .update({ status: newStatus, resolved_by: authUser.email, resolved_at: new Date().toISOString() })
    .eq("id", item.id);
  if (!error) await loadHelpItems();
};
```

- [ ] **Step 6: Add handleHelpDelete function (Admin only)**

```javascript
const handleHelpDelete = async (item) => {
  if (!authUser?.isAdmin) return;
  const { error } = await supabase.from("help_items").delete().eq("id", item.id);
  if (!error) setHelpItems(prev => prev.filter(i => i.id !== item.id));
};
```

---

### Task 16: Build HelpPanel component

**Files:**
- Modify: `src/App.jsx` — add new component before the main `export default` or `function App()`

- [ ] **Step 1: Add helpDateLabel helper inside the HelpPanel component**

`daysAgo` is already imported from `src/lib/db` and returns a **number** (integer count). Replacing or shadowing it would break existing stale-project logic that uses the numeric result. Instead, add a local string formatter at the top of the `HelpPanel` function body — not at module scope:

```javascript
// Place this as the first line inside function HelpPanel({ ... }) {
const helpDateLabel = (ts) => {
  const d = Math.floor((Date.now() - new Date(ts).getTime()) / 86400000);
  if (d === 0) return "Today";
  if (d === 1) return "Yesterday";
  return `${d} days ago`;
};
```

Then anywhere in HelpPanel that shows a date, call `helpDateLabel(item.created_at)` — **not** `daysAgo(item.created_at)`.

- [ ] **Step 2: Add HelpPanel component**

Add the full HelpPanel component. Place it just before the `function App()` declaration or near other component definitions:

```javascript
function HelpPanel({ open, onClose, items, filter, setFilter, page, setPage,
  view, setView, submitType, setSubmitType, formTitle, setFormTitle,
  formDesc, setFormDesc, editItem, onOpen, onSubmit, onUpvote,
  onResolve, onDelete, onStartEdit, loading, authUser }) {

  const ITEMS_PER_PAGE = 10;

  const filtered = items.filter(i =>
    filter === "all" ? true :
    filter === "report" ? i.type === "report" : i.type === "ask"
  );
  const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE);
  const pageItems  = filtered.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE);

  const submitterName = (email) => {
    // Try to get first name from authUser if it's the current user's own item
    if (email === authUser?.email && authUser?.firstName) return authUser.firstName;
    return email.split("@")[0];
  };

  return (
    <>
      {/* FAB */}
      <button
        onClick={open ? onClose : onOpen}
        style={{
          position:"fixed", bottom:20, right:20, width:40, height:40,
          borderRadius:"50%", background:C.kangkong700, border:"none",
          cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center",
          boxShadow:"0 2px 8px rgba(0,0,0,0.18)",
          zIndex:50, transition:"transform 0.15s, background 0.15s",
        }}
        onMouseOver={e=>{e.currentTarget.style.background=C.kangkong800;e.currentTarget.style.transform="scale(1.05)";}}
        onMouseOut={e=>{e.currentTarget.style.background=C.kangkong700;e.currentTarget.style.transform="scale(1)";}}
        title="Help"
      >
        {/* Question mark icon */}
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
          <circle cx="12" cy="12" r="10" stroke="white" strokeWidth="2"/>
          <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" stroke="white" strokeWidth="2" strokeLinecap="round"/>
          <circle cx="12" cy="17" r="0.5" fill="white" stroke="white" strokeWidth="1.5"/>
        </svg>
      </button>

      {/* Panel */}
      {open && (
        <div style={{
          position:"fixed", top:0, right:0, width:320, height:"100vh",
          background:C.white, borderLeft:"1px solid "+C.mushroom200,
          zIndex:55, display:"flex", flexDirection:"column",
          transform:"translateX(0)", animation:"slideInPanel 0.22s cubic-bezier(0.4,0,0.2,1)",
          boxShadow:"-4px 0 20px rgba(0,0,0,0.08)",
        }}>

          {/* Panel header */}
          <div style={{padding:"12px 14px 0", borderBottom:"1px solid "+C.mushroom200, flexShrink:0}}>
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:10}}>
              <span style={{fontFamily:FF,fontSize:15,fontWeight:600,color:C.mushroom900}}>Help</span>
              <button onClick={onClose} style={{width:28,height:28,borderRadius:DS.radius.sm,border:"none",background:"none",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",color:C.mushroom500,fontSize:16,fontWeight:300}}
                onMouseOver={e=>e.currentTarget.style.background=C.mushroom100}
                onMouseOut={e=>e.currentTarget.style.background="none"}
              >✕</button>
            </div>

            {/* + Report and + Ask buttons — hidden during submit/edit */}
            {view === "feed" && (
              <div style={{display:"flex",gap:6,marginBottom:10}}>
                <button onClick={()=>{setSubmitType("report");setFormTitle("");setFormDesc("");setView("submit");}}
                  style={{flex:1,padding:"6px 0",borderRadius:DS.radius.sm,border:"1px solid "+C.mushroom200,background:"none",fontFamily:FF,fontSize:12,fontWeight:500,color:C.mushroom700,cursor:"pointer",transition:"all 0.15s"}}
                  onMouseOver={e=>{e.currentTarget.style.background=C.tomato100;e.currentTarget.style.color=C.tomato600;e.currentTarget.style.borderColor="#FFCDD2";}}
                  onMouseOut={e=>{e.currentTarget.style.background="none";e.currentTarget.style.color=C.mushroom700;e.currentTarget.style.borderColor=C.mushroom200;}}
                >+ Report</button>
                <button onClick={()=>{setSubmitType("ask");setFormTitle("");setFormDesc("");setView("submit");}}
                  style={{flex:1,padding:"6px 0",borderRadius:DS.radius.sm,border:"1px solid "+C.mushroom200,background:"none",fontFamily:FF,fontSize:12,fontWeight:500,color:C.mushroom700,cursor:"pointer",transition:"all 0.15s"}}
                  onMouseOver={e=>{e.currentTarget.style.background=C.blueberry100;e.currentTarget.style.color=C.blueberry500;e.currentTarget.style.borderColor="#BBDEFB";}}
                  onMouseOut={e=>{e.currentTarget.style.background="none";e.currentTarget.style.color=C.mushroom700;e.currentTarget.style.borderColor=C.mushroom200;}}
                >+ Ask</button>
              </div>
            )}

            {/* Filter tabs — only in feed view */}
            {view === "feed" && (
              <div style={{display:"flex",gap:0,borderBottom:"1px solid "+C.mushroom200}}>
                {[["all","All"],["report","Reports"],["ask","Asks"]].map(([val,label])=>(
                  <button key={val} onClick={()=>{setFilter(val);setPage(1);}}
                    style={{padding:"6px 12px",fontFamily:FF,fontSize:12,fontWeight:500,border:"none",background:"none",cursor:"pointer",
                      color:filter===val?C.kangkong600:C.mushroom500,
                      borderBottom:filter===val?"2px solid "+C.kangkong600:"2px solid transparent",
                      transition:"all 0.15s",
                    }}
                  >{label}</button>
                ))}
              </div>
            )}
          </div>

          {/* Panel body */}
          <div style={{flex:1,overflowY:"auto",padding:"12px 14px"}}>
            {view === "feed" && (
              <>
                {pageItems.length === 0 ? (
                  <div style={{display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",minHeight:200,gap:8}}>
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
                      <circle cx="12" cy="12" r="9" stroke={C.mushroom300} strokeWidth="1.5"/>
                      <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" stroke={C.mushroom300} strokeWidth="1.5" strokeLinecap="round"/>
                      <circle cx="12" cy="17" r="0.5" fill={C.mushroom300} stroke={C.mushroom300} strokeWidth="1"/>
                    </svg>
                    <div style={{fontFamily:FF,fontSize:13,color:C.mushroom500}}>Nothing here yet.</div>
                    <div style={{fontFamily:FF,fontSize:12,color:C.mushroom400,textAlign:"center"}}>Be the first to submit a report or ask a question.</div>
                  </div>
                ) : (
                  pageItems.map(item => {
                    const isSettled = item.status === "resolved" || item.status === "answered";
                    const isOwn     = item.submitted_by === authUser?.email;
                    const hasVoted  = item.upvoters?.includes(authUser?.email);
                    const canEdit   = isOwn && !isSettled;
                    return (
                      <div key={item.id} style={{padding:"10px 0",borderBottom:"1px solid "+C.mushroom100,opacity:isSettled?0.5:1}}>
                        <div style={{display:"flex",alignItems:"flex-start",gap:8}}>
                          {/* Type dot */}
                          <div style={{width:6,height:6,borderRadius:"50%",marginTop:5,flexShrink:0,background:item.type==="report"?C.tomato600:C.blueberry500}}/>
                          <div style={{flex:1,minWidth:0}}>
                            <div style={{fontFamily:FF,fontSize:13,fontWeight:500,color:C.mushroom900,lineHeight:1.4,marginBottom:4}}>{item.title}</div>
                            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",flexWrap:"wrap",gap:4}}>
                              <span style={{fontFamily:FF,fontSize:11,color:C.mushroom500}}>{submitterName(item.submitted_by)} · {helpDateLabel(item.created_at)}</span>
                              <div style={{display:"flex",alignItems:"center",gap:6}}>
                                {/* Upvote button */}
                                <button
                                  onClick={()=>!isOwn&&handleHelpUpvote(item)}
                                  disabled={isOwn}
                                  style={{display:"flex",alignItems:"center",gap:3,padding:"2px 6px",border:"1px solid "+C.mushroom200,borderRadius:DS.radius.sm,background:hasVoted?C.kangkong50:"none",color:hasVoted?C.kangkong700:C.mushroom500,fontFamily:FF,fontSize:11,cursor:isOwn?"default":"pointer",transition:"all 0.15s",}}
                                >
                                  <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M5 1L9 9H1L5 1Z" fill={hasVoted?C.kangkong700:C.mushroom400}/></svg>
                                  {item.upvoters?.length || 0}
                                </button>
                                {/* Status pill */}
                                <span style={{fontFamily:FF,fontSize:10,fontWeight:600,padding:"2px 7px",borderRadius:DS.radius.full,background:isSettled?C.kangkong100:C.mango100,color:isSettled?C.kangkong700:C.mango700,}}>
                                  {item.status}
                                </span>
                              </div>
                            </div>
                            {/* Admin + Edit actions */}
                            <div style={{display:"flex",gap:6,marginTop:6}}>
                              {canEdit && (
                                <button onClick={()=>onStartEdit(item)}
                                  style={{fontFamily:FF,fontSize:11,color:C.mushroom500,background:"none",border:"none",cursor:"pointer",padding:0,textDecoration:"underline"}}>Edit</button>
                              )}
                              {authUser?.isAdmin && !isSettled && (
                                <button onClick={()=>onResolve(item)}
                                  style={{fontFamily:FF,fontSize:11,color:C.kangkong600,background:"none",border:"none",cursor:"pointer",padding:0,textDecoration:"underline"}}>
                                  {item.type==="report"?"Mark resolved":"Mark answered"}
                                </button>
                              )}
                              {authUser?.isAdmin && (
                                <button onClick={()=>onDelete(item)}
                                  style={{fontFamily:FF,fontSize:11,color:C.tomato600,background:"none",border:"none",cursor:"pointer",padding:0,textDecoration:"underline"}}>Delete</button>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </>
            )}

            {(view === "submit" || view === "edit") && (
              <div style={{display:"flex",flexDirection:"column",gap:12}}>
                {/* Back button */}
                <button onClick={()=>setView("feed")}
                  style={{display:"flex",alignItems:"center",gap:4,fontFamily:FF,fontSize:12,color:C.mushroom500,background:"none",border:"none",cursor:"pointer",padding:0,alignSelf:"flex-start"}}>
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M8 2L4 6L8 10" stroke={C.mushroom500} strokeWidth="1.5" strokeLinecap="round"/></svg>
                  Back to Help
                </button>
                <div style={{fontFamily:FF,fontSize:14,fontWeight:600,color:C.mushroom900}}>
                  {view==="edit" ? "Edit your submission" : submitType==="report" ? "Submit a report" : "Ask a question"}
                </div>
                {/* Type toggle — only on new submit */}
                {view === "submit" && (
                  <div style={{display:"flex",gap:6}}>
                    {[["report","Report"],["ask","Ask"]].map(([val,label])=>(
                      <button key={val} onClick={()=>setSubmitType(val)}
                        style={{flex:1,padding:"6px 0",borderRadius:DS.radius.sm,fontFamily:FF,fontSize:12,fontWeight:500,cursor:"pointer",transition:"all 0.15s",
                          border: submitType===val
                            ? (val==="report"?"1px solid #FFCDD2":"1px solid #BBDEFB")
                            : "1px solid "+C.mushroom200,
                          background: submitType===val
                            ? (val==="report"?C.tomato100:C.blueberry100)
                            : "none",
                          color: submitType===val
                            ? (val==="report"?C.tomato600:C.blueberry500)
                            : C.mushroom500,
                        }}
                      >{label}</button>
                    ))}
                  </div>
                )}
                {/* Submitter strip */}
                <div style={{display:"flex",alignItems:"center",gap:8,background:C.mushroom50,border:"1px solid "+C.mushroom200,borderRadius:DS.radius.sm,padding:"6px 10px"}}>
                  <div style={{width:24,height:24,borderRadius:"50%",background:C.kangkong200,display:"flex",alignItems:"center",justifyContent:"center",fontFamily:FF,fontSize:10,fontWeight:700,color:C.kangkong700,flexShrink:0}}>
                    {(authUser?.firstName||authUser?.displayName||"?")[0].toUpperCase()}
                  </div>
                  <span style={{fontFamily:FF,fontSize:11,color:C.mushroom600}}>Submitting as {authUser?.firstName||authUser?.displayName||authUser?.email}</span>
                </div>
                {/* Title field */}
                <input
                  value={helpFormTitle}
                  onChange={e=>setHelpFormTitle(e.target.value)}
                  placeholder="Brief description..."
                  style={{width:"100%",padding:"8px 10px",borderRadius:DS.radius.sm,border:"1px solid "+C.mushroom200,fontFamily:FF,fontSize:13,color:C.mushroom900,outline:"none"}}
                />
                {/* Description field */}
                <textarea
                  value={helpFormDesc}
                  onChange={e=>setHelpFormDesc(e.target.value)}
                  placeholder="Steps to reproduce, or more context... (optional)"
                  rows={4}
                  style={{width:"100%",padding:"8px 10px",borderRadius:DS.radius.sm,border:"1px solid "+C.mushroom200,fontFamily:FF,fontSize:13,color:C.mushroom900,outline:"none",resize:"vertical"}}
                />
                {/* Submit button */}
                <button
                  onClick={onSubmit}
                  disabled={!helpFormTitle.trim()||loading}
                  style={{width:"100%",padding:"10px 0",borderRadius:DS.radius.md,background:helpFormTitle.trim()?C.kangkong700:"#ccc",border:"none",color:C.white,fontFamily:FF,fontSize:13,fontWeight:600,cursor:helpFormTitle.trim()?"pointer":"default",transition:"background 0.15s"}}
                  onMouseOver={e=>{if(helpFormTitle.trim())e.currentTarget.style.background=C.kangkong800;}}
                  onMouseOut={e=>{if(helpFormTitle.trim())e.currentTarget.style.background=C.kangkong700;}}
                >
                  {loading ? "Submitting…" : view==="edit" ? "Save changes" : "Submit"}
                </button>
              </div>
            )}
          </div>

          {/* Pagination footer — only in feed view, only when multiple pages */}
          {view === "feed" && totalPages > 1 && (
            <div style={{borderTop:"1px solid "+C.mushroom200,padding:"8px 14px",display:"flex",alignItems:"center",justifyContent:"space-between",flexShrink:0}}>
              <button onClick={()=>setPage(p=>Math.max(1,p-1))} disabled={page===1}
                style={{padding:"4px 10px",border:"1px solid "+C.mushroom200,borderRadius:DS.radius.sm,fontFamily:FF,fontSize:11,background:"none",cursor:page===1?"default":"pointer",color:page===1?C.mushroom300:C.mushroom600}}>Prev</button>
              <span style={{fontFamily:FF,fontSize:11,color:C.mushroom500}}>{page} of {totalPages}</span>
              <button onClick={()=>setPage(p=>Math.min(totalPages,p+1))} disabled={page===totalPages}
                style={{padding:"4px 10px",border:"1px solid "+C.mushroom200,borderRadius:DS.radius.sm,fontFamily:FF,fontSize:11,background:"none",cursor:page===totalPages?"default":"pointer",color:page===totalPages?C.mushroom300:C.mushroom600}}>Next</button>
            </div>
          )}
        </div>
      )}
    </>
  );
}
```

---

### Task 17: Mount HelpPanel in app render

**Files:**
- Modify: `src/App.jsx` — main render return

- [ ] **Step 1: Add HelpPanel to the authenticated app render**

Find the closing of the main app render (just before `</div>` at the end of the return, but after the WelcomeModal block near line 4350).

Add `HelpPanel` after the WelcomeModal block:

```javascript
      <HelpPanel
        open={helpOpen}
        onClose={() => setHelpOpen(false)}
        onOpen={handleHelpOpen}
        items={helpItems}
        filter={helpFilter}
        setFilter={setHelpFilter}
        page={helpPage}
        setPage={setHelpPage}
        view={helpView}
        setView={setHelpView}
        submitType={helpSubmitType}
        setSubmitType={setHelpSubmitType}
        formTitle={helpFormTitle}
        setFormTitle={setHelpFormTitle}
        formDesc={helpFormDesc}
        setFormDesc={setHelpFormDesc}
        editItem={helpEditItem}
        onSubmit={handleHelpSubmit}
        onUpvote={handleHelpUpvote}
        onResolve={handleHelpResolve}
        onDelete={handleHelpDelete}
        onStartEdit={(item) => { setHelpEditItem(item); setHelpFormTitle(item.title); setHelpFormDesc(item.description || ""); setHelpView("edit"); }}
        loading={helpLoading}
        authUser={authUser}
      />
```

Add a new `slideInPanel` keyframe to the `<style>` block (around line 4355). Do **not** modify the existing `slideInRight` keyframe — it is used by the project detail panel and has a different animation. HelpPanel uses its own dedicated keyframe:

```css
@keyframes slideInPanel{from{transform:translateX(100%)}to{transform:translateX(0)}}
```

---

### Task 18: Verify E3 and commit

- [ ] **Step 1: Run dev server and test**

```bash
npm run dev
```

Test cases:
1. Green question-mark FAB visible in bottom-right on all views
2. Click FAB → panel slides in from right. Feed shows empty state ("Nothing here yet.")
3. Click `+ Report` → submit form opens with Report pre-selected
4. Fill title, click Submit → item appears in feed with "open" status pill
5. Click `+ Ask` → same flow, item appears with "unanswered" status
6. Click upvote on another user's item (if testing with two accounts) → count increments
7. Own item: upvote button disabled
8. Log in as Admin → "Mark resolved" and "Delete" buttons appear on items
9. Mark as resolved → item gets 50% opacity + kangkong "resolved" pill
10. Delete → item removed immediately
11. Filter tabs work (Reports / Asks / All)
12. Pagination appears when >10 items exist

- [ ] **Step 2: Commit**

```bash
git add src/App.jsx supabase/migrations/05-help-items.sql
git commit -m "feat(E3): add Help panel — FAB, slide-over, feed, submit, admin actions, help_items DB migration"
```

---

## Final Verification and PR

- [ ] **Step 1: Run the dev server one final time and smoke-test all 4 enhancements**

1. Login screen shows Google button only (no email/password)
2. Sign in with Google → first name appears in welcome modal greeting
3. Welcome modal → Approver sees third card, regular user does not
4. Role badges in nav show "Admin" / "Approver" based on DB flags
5. Nursery review works for Approvers (not Admins)
6. Stage change permissions work correctly for Admins
7. Help FAB visible on all tabs, panel slides in, submit/feed/admin all work

- [ ] **Step 2: Manual Supabase setup checklist (before deploying to Vercel)**

- [ ] Migration 04 run in Supabase dashboard (role column renames + `first_name`)
- [ ] Migration 05 run in Supabase dashboard (`help_items` table)
- [ ] Google OAuth provider enabled in Supabase Auth settings
- [ ] Google OAuth credentials (Client ID + Secret) entered in Supabase
- [ ] Redirect URIs configured in both Google Cloud Console and Supabase:
  - Production: `https://<project-ref>.supabase.co/auth/v1/callback`
  - Local dev: `http://localhost:5173`
- [ ] Vercel env vars still set: `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`

- [ ] **Step 3: Push and open PR**

```bash
git push origin main
```

Or if working on a feature branch:
```bash
git push origin <branch-name>
# Then open PR via GitHub or: gh pr create
```
