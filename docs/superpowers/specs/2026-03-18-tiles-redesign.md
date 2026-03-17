# Tiles (Directory) Card Redesign
**Date:** 2026-03-18
**Status:** Approved

---

## Problem

The current directory card is visually cluttered. It includes a ProjectImage SVG cover (110px tall), tool chips, a country flag badge, staleness/overlap warning icons, and an impact number — most of which are either auto-generated filler, always "TBD", or redundant with the detail panel. Users cannot quickly scan what a project is or who owns it.

---

## Goal

A clean, minimal card that communicates three things at a glance:
1. **What the project is** — name + description
2. **Where it is in the pipeline** — stage badge
3. **Who owns it and who it's for** — builder avatar + built-for department

---

## Card Design

### Structure

```
┌─────────────────────────────┬──────────┐
│ Project Name (bold)         │ Seedling │  ← stage badge, absolute top-right
│                             └──────────┘
│ Description — up to 3 lines, truncated
│ with ellipsis...
│ ─────────────────────────────────────────
│  ◉ kvirata              Sales │
└─────────────────────────────────────────┘
```

### Elements

| Element | Details |
|---|---|
| **Stage badge** | Absolute top-right (`position: absolute`, `top: 14px`, `right: 14px`). Use `sc = STAGE_COLORS[project.stage] \|\| STAGE_COLORS.seedling` for all colors. Render as an inline-styled `<span>` with `background: sc.bg`, `color: sc.text`, `border: "0.5px solid " + sc.border`, `borderRadius: DS.radius.full`. Inside: a 6×6px circle dot with `background: sc.dot`, then the stage label text. `font-size: 10px`, `font-weight: 600`. |
| **Project name** | `font-size: 14px`, `font-weight: 700`, `color: C.mushroom900`, `line-height: 1.35`. Add `paddingRight: 80px` to prevent text running under the absolute-positioned stage badge. |
| **Description** | Field: `project.description`. `font-size: 12px`, `color: C.mushroom600`, `line-height: 1.6`. Clamped to **3 lines** with `-webkit-line-clamp: 3` and `overflow: hidden` (up from 2 lines in the current card). If `project.description` is null or empty, render nothing. |
| **Divider** | `borderTop: "1px solid " + C.mushroom100`. Full-width. `margin: 2px 0`. |
| **Footer container** | `display: flex`, `alignItems: center`, `justifyContent: space-between`, `gap: 8`. |
| **Avatar** | 24×24px circle (`borderRadius: "50%"`). Background and text color from `COVER_COLORS[project.builtBy]` — uses `.bg` and `.text` properties (e.g. `COVER_COLORS.Sales = {bg:"#E3F2FD", text:"#1565C0"}`). If `project.builtBy` is not in `COVER_COLORS`, fall back to `COVER_COLORS.default`. Initials: call existing `getInitials(project.builder)` — note this passes the **builder's name** (e.g. `"Maya Santos"`) not the project name (the existing `ProjectImage` uses `getInitials(project.name)`, but here we want the person's initials). `getInitials` is already defined in the file — do not add a duplicate. |
| **Builder name** | Field: `project.builder`. `font-size: 12px`, `color: C.mushroom600`, `font-weight: 500`. Avatar + name are grouped in a flex row with `gap: 7`, `alignItems: center`. If `project.builder` is null or empty, show `"Unknown"` as fallback. |
| **Dept chip** | Field: `project.builtFor`. Right side of footer. `dc = DEPT_COLORS[project.builtFor]`. Note: `DEPT_COLORS` values are plain hex strings (e.g. `"#F97316"`), not objects — so `dc+"18"` produces a valid 8-digit hex for the background and `dc` is used directly as the text color. `font-size: 11px`, `font-weight: 600`, `padding: "2px 8px"`, `borderRadius: DS.radius.full`. If `project.builtFor` is null or `dc` is undefined, do not render the chip. |

### Card Container

| Property | Value |
|---|---|
| Background | `C.white` |
| Border | `"1px solid " + C.mushroom200` (resting) |
| Border radius | `DS.radius.xl` |
| Padding | `16px` |
| Position | `relative` (required for absolute stage badge) |
| Resting shadow | none (flat) |
| Hover | `onMouseOver`/`onMouseOut` inline-style handlers (same pattern as existing card). On hover: border → `C.mushroom300`, `boxShadow: DS.shadow.lg`, `transform: "translateY(-2px)"`. On mouse-out: restore resting values. |
| Transition | `"all 0.15s"` |
| Focus state | Out of scope |

### Grid

**Do not change the grid.** Leave `gridTemplateColumns`, `gap`, and all other grid properties exactly as they are in the current code.

---

## What Is Removed

| Removed | Reason |
|---|---|
| `ProjectImage` SVG cover (110px) | Dominant visual with no real information density |
| `CountryBadge` (flag) | Redundant — visible in detail panel |
| `ToolChip` list (first 3 + "+N more") | Clutters card; visible in detail panel |
| `IcoStale` staleness icon | Noisy on small card; visible in detail panel |
| `IcoWarning` overlap icon | Noisy on small card; visible in detail panel |
| Impact number + `IcoImpact` | Removed from Add to Garden form; always "TBD" for new plants |

---

## Scope

- **Only the directory ("tiles") view card block is changed** (~lines 1943–1984 in App.jsx). Board cards and garden view are untouched.
- **No new data fields or DB changes.** All fields already exist on the project object.
- **No changes to the detail panel.** Clicking a card still opens the same `DetailPanel`.
- **Description line clamp changes from 2 → 3 lines.** Acceptable given the removed image frees vertical space.
- **`getInitials` already exists** in App.jsx at line ~747. Do not add a new definition — reuse it, passing `project.builder` as the argument.
- **Seed/wish cards** (dashed-border cards rendered when `showSeeds === true`) are out of scope.

---

## Files Changed

| File | Change |
|---|---|
| `src/App.jsx` | Replace project card JSX block (~lines 1943–1984) with new layout as specified above. No other changes. |
