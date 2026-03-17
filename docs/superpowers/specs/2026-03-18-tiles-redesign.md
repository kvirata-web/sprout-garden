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
| **Stage badge** | Absolute top-right. Small colored pill (`font-size: 10px`). Colored dot + stage label. One color per stage (see below). |
| **Project name** | `font-size: 14px`, `font-weight: 700`, `color: mushroom900`. Full width (stage badge is absolute, doesn't push name). |
| **Description** | `font-size: 12px`, `color: mushroom600`, `line-height: 1.6`. Clamped to 3 lines with `-webkit-line-clamp: 3`. |
| **Divider** | `1px solid mushroom100`. Thin separator between content and footer. |
| **Avatar** | 24×24px circle. Initials from `builder` name (first 2 chars, uppercased). Color derived from `builtBy` department using `DEPT_COLORS`. |
| **Builder name** | `font-size: 12px`, `color: mushroom600`. Displayed as plain text next to avatar. |
| **Dept chip** | Built-for department. Right side of footer. Uses existing `DEPT_COLORS` for background/text. `font-size: 11px`, `font-weight: 600`, pill shape. |

### Stage Badge Colors

| Stage | Background | Text | Dot |
|---|---|---|---|
| seedling | `mango50` / amber tint | `mango700` | `mango600` |
| nursery | `blueberry50` | `blueberry700` | `blueberry600` |
| sprout | `kangkong50` | `kangkong700` | `kangkong600` |
| bloom | `plum50` (pink-purple) | `plum700` | `plum600` |
| thriving | `teal50` | `teal700` | `teal600` |

Use the existing `STAGE_COLORS` map in App.jsx — align with whatever color tokens it already defines for each stage.

### Card Container

| Property | Value |
|---|---|
| Background | `white` |
| Border | `1px solid mushroom200` |
| Border radius | `DS.radius.xl` (12px) |
| Padding | `16px` |
| Position | `relative` (required for absolute stage badge) |
| Hover | `translateY(-2px)` + `boxShadow: lg`, `border-color: mushroom300` |
| Transition | `all 0.15s` |

### Grid

No change to the grid container:
- `display: grid`
- `gridTemplateColumns: repeat(auto-fill, minmax(260px, 1fr))`
- `gap: 12px`

---

## What Is Removed

| Removed | Reason |
|---|---|
| ProjectImage SVG cover (110px) | Dominant visual with no real information density |
| Country flag (CountryBadge) | Redundant — country is available in the detail panel |
| Tool chips (ToolChip ×3 + "+N more") | Already visible in detail panel; clutters the card |
| Staleness icon (IcoStale) | Available in detail panel; too noisy on a small card |
| Overlap warning icon (IcoWarning) | Available in detail panel |
| Impact number + IcoImpact | Field was removed from the Add to Garden form; always "TBD" for new plants |

---

## Avatar Initials Logic

```js
const getInitials = (name) => {
  if (!name) return '?'
  const parts = name.trim().split(/\s+/)
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}
```

Avatar background color: use `DEPT_COLORS[project.builtBy]` — same color as the builtBy department. This visually connects builder to their team.

---

## Scope

- **Only the directory ("tiles") view is changed.** Board cards and garden view are untouched.
- **No new data fields or DB changes.** All data already exists on the project object.
- **No changes to the detail panel.** Clicking a card still opens the same DetailPanel.
- **Seed cards** (wishlist items shown in the directory) are out of scope — their dashed-border card design is separate and not changed.

---

## Files Changed

| File | Change |
|---|---|
| `src/App.jsx` | Replace the project card JSX block (lines ~1943–1984) with new card layout |

No other files need to change.
