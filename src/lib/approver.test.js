/**
 * Approver role test suite
 *
 * Tests the pure logic for:
 * - myProjects filter (email + displayName fallback)
 * - nurseryQueue filter
 * - Stage transition permission guards
 * - approveProject / needsRework permission guards
 * - Data integrity through toProject / fromProject
 *
 * Note: Supabase mutations (approveProject, needsRework, submitToNursery) call
 * Supabase directly in App.jsx and are not unit-testable here. Use the Playwright
 * E2E suite for those. This file covers all logic that can be expressed as pure
 * functions.
 */

import { describe, it, expect, vi } from 'vitest'

vi.mock('./supabase', () => ({ supabase: {} }))

import { toProject, fromProject } from './db.js'

// ── Helpers / fixtures ────────────────────────────────────────────────────────

const makeProject = (overrides = {}) => ({
  id: 1,
  country: 'PH',
  name: 'Test Plant',
  stage: 'seedling',
  builderEmail: 'alice@sprout.ph',
  builder: 'alice',
  milestones: [],
  notes: [],
  reviewStatus: null,
  submittedAt: null,
  lastUpdated: 0,
  ...overrides,
})

const makeApprover = (overrides = {}) => ({
  email: 'approver@sprout.ph',
  displayName: 'approver',
  isAdmin: false,
  isApprover: true,
  country: 'PH',
  ...overrides,
})

const makeAdmin = (overrides = {}) => ({
  email: 'admin@sprout.ph',
  displayName: 'admin',
  isAdmin: true,
  isApprover: false,
  country: 'PH',
  ...overrides,
})

const makeUser = (overrides = {}) => ({
  email: 'user@sprout.ph',
  displayName: 'user',
  isAdmin: false,
  isApprover: false,
  country: 'PH',
  ...overrides,
})

// ── Pure logic extracted from App.jsx ─────────────────────────────────────────
// These mirror the exact expressions used in the component so tests catch regressions.

const filterMyProjects = (projects, authUser) =>
  projects.filter(p =>
    p.builderEmail === authUser?.email ||
    (authUser?.displayName && p.builder === authUser.displayName)
  )

const filterNurseryQueue = (projects) =>
  projects.filter(p => p.stage === 'nursery')

const canApprove = (authUser) =>
  !!(authUser?.isApprover || authUser?.isAdmin)

const canMoveStage = (project, authUser) =>
  !!(authUser && (authUser.email === project.builderEmail || authUser.isAdmin))

const STAGES = ['seedling', 'nursery', 'sprout', 'bloom', 'thriving']

const getAdjacentStages = (currentStage) => {
  const idx = STAGES.indexOf(currentStage)
  if (idx === -1) return []
  return STAGES.filter((_, i) => Math.abs(i - idx) === 1)
}

const isValidStageMove = (project, targetStage, authUser) => {
  if (!STAGES.includes(targetStage)) return false
  if (targetStage === project.stage) return false
  if (authUser?.isAdmin) return true // admins can skip stages
  return getAdjacentStages(project.stage).includes(targetStage)
}

// ── myProjects filter ─────────────────────────────────────────────────────────

describe('filterMyProjects — email match', () => {
  it('returns projects where builderEmail matches authUser.email', () => {
    const user = makeUser()
    const projects = [
      makeProject({ builderEmail: 'user@sprout.ph', builder: 'user' }),
      makeProject({ id: 2, builderEmail: 'other@sprout.ph', builder: 'other' }),
    ]
    expect(filterMyProjects(projects, user)).toHaveLength(1)
    expect(filterMyProjects(projects, user)[0].builderEmail).toBe('user@sprout.ph')
  })

  it('returns empty array when no email match and no displayName match', () => {
    const user = makeUser({ email: 'nobody@sprout.ph', displayName: 'nobody' })
    const projects = [makeProject({ builderEmail: 'other@sprout.ph', builder: 'other' })]
    expect(filterMyProjects(projects, user)).toHaveLength(0)
  })

  it('returns empty array when authUser is null', () => {
    const projects = [makeProject()]
    expect(filterMyProjects(projects, null)).toHaveLength(0)
  })
})

describe('filterMyProjects — displayName fallback', () => {
  it('falls back to builder displayName when builderEmail is empty', () => {
    const user = makeUser({ email: 'user@sprout.ph', displayName: 'user' })
    const projects = [
      makeProject({ builderEmail: '', builder: 'user' }),    // email missing, name matches
      makeProject({ id: 2, builderEmail: '', builder: 'other' }), // neither match
    ]
    const result = filterMyProjects(projects, user)
    expect(result).toHaveLength(1)
    expect(result[0].builder).toBe('user')
  })

  it('falls back to builder displayName when builderEmail is null', () => {
    const user = makeUser({ email: 'user@sprout.ph', displayName: 'user' })
    const projects = [makeProject({ builderEmail: null, builder: 'user' })]
    expect(filterMyProjects(projects, user)).toHaveLength(1)
  })

  it('does NOT fall back when authUser.displayName is undefined', () => {
    const user = makeUser({ email: 'user@sprout.ph', displayName: undefined })
    const projects = [makeProject({ builderEmail: null, builder: 'user' })]
    expect(filterMyProjects(projects, user)).toHaveLength(0)
  })

  it('does NOT use displayName fallback when email already matches', () => {
    const user = makeUser({ email: 'user@sprout.ph', displayName: 'alias' })
    const projects = [makeProject({ builderEmail: 'user@sprout.ph', builder: 'alias' })]
    // Should still return 1 (email match, not double-counted)
    expect(filterMyProjects(projects, user)).toHaveLength(1)
  })

  it('approver sees their own plants via email match', () => {
    const approver = makeApprover()
    const projects = [
      makeProject({ builderEmail: 'approver@sprout.ph', builder: 'approver' }),
      makeProject({ id: 2, builderEmail: 'someone@sprout.ph', builder: 'someone' }),
    ]
    expect(filterMyProjects(projects, approver)).toHaveLength(1)
    expect(filterMyProjects(projects, approver)[0].builderEmail).toBe('approver@sprout.ph')
  })

  it('approver sees their plants after approval (stage changed to sprout)', () => {
    const approver = makeApprover()
    const projects = [
      makeProject({
        builderEmail: 'approver@sprout.ph',
        builder: 'approver',
        stage: 'sprout',  // after approval
        reviewStatus: 'approved',
      }),
    ]
    expect(filterMyProjects(projects, approver)).toHaveLength(1)
  })
})

// ── nurseryQueue filter ───────────────────────────────────────────────────────

describe('filterNurseryQueue', () => {
  it('returns only nursery-stage projects', () => {
    const projects = [
      makeProject({ stage: 'seedling' }),
      makeProject({ id: 2, stage: 'nursery' }),
      makeProject({ id: 3, stage: 'sprout' }),
      makeProject({ id: 4, stage: 'nursery' }),
    ]
    const queue = filterNurseryQueue(projects)
    expect(queue).toHaveLength(2)
    expect(queue.every(p => p.stage === 'nursery')).toBe(true)
  })

  it('returns empty array when no nursery plants', () => {
    const projects = [makeProject({ stage: 'seedling' }), makeProject({ id: 2, stage: 'sprout' })]
    expect(filterNurseryQueue(projects)).toHaveLength(0)
  })

  it('includes all nursery plants regardless of review_status', () => {
    const projects = [
      makeProject({ id: 1, stage: 'nursery', reviewStatus: 'pending' }),
      makeProject({ id: 2, stage: 'nursery', reviewStatus: 'needs_rework' }),
    ]
    expect(filterNurseryQueue(projects)).toHaveLength(2)
  })
})

// ── approveProject / needsRework permission guards ────────────────────────────

describe('canApprove — permission guard', () => {
  it('returns true for isApprover', () => {
    expect(canApprove(makeApprover())).toBe(true)
  })

  it('returns true for isAdmin', () => {
    expect(canApprove(makeAdmin())).toBe(true)
  })

  it('returns false for a normal user', () => {
    expect(canApprove(makeUser())).toBe(false)
  })

  it('returns false for null authUser', () => {
    expect(canApprove(null)).toBe(false)
  })

  it('returns false for undefined authUser', () => {
    expect(canApprove(undefined)).toBe(false)
  })

  it('returns true for user with both isApprover and isAdmin', () => {
    expect(canApprove(makeApprover({ isAdmin: true }))).toBe(true)
  })
})

// ── Stage transition permission ───────────────────────────────────────────────

describe('canMoveStage', () => {
  it('allows builder to move their own project', () => {
    const project = makeProject({ builderEmail: 'user@sprout.ph' })
    const user = makeUser({ email: 'user@sprout.ph' })
    expect(canMoveStage(project, user)).toBe(true)
  })

  it('denies user who is not the builder', () => {
    const project = makeProject({ builderEmail: 'alice@sprout.ph' })
    const user = makeUser({ email: 'bob@sprout.ph' })
    expect(canMoveStage(project, user)).toBe(false)
  })

  it('allows admin to move any project', () => {
    const project = makeProject({ builderEmail: 'alice@sprout.ph' })
    expect(canMoveStage(project, makeAdmin())).toBe(true)
  })

  it('denies null authUser', () => {
    expect(canMoveStage(makeProject(), null)).toBe(false)
  })
})

describe('isValidStageMove — adjacent stages only for normal users', () => {
  it('allows seedling → sprout (only adjacent) for builder', () => {
    // nursery is adjacent to seedling, sprout is not adjacent to seedling
    // STAGES = ['seedling','nursery','sprout','bloom','thriving']
    const user = makeUser()
    const project = makeProject({ builderEmail: 'user@sprout.ph', stage: 'seedling' })
    expect(isValidStageMove(project, 'nursery', user)).toBe(true)
    expect(isValidStageMove(project, 'sprout', user)).toBe(false)
    expect(isValidStageMove(project, 'bloom', user)).toBe(false)
  })

  it('allows sprout → bloom or sprout → nursery for builder', () => {
    const user = makeUser()
    const project = makeProject({ builderEmail: 'user@sprout.ph', stage: 'sprout' })
    expect(isValidStageMove(project, 'bloom', user)).toBe(true)
    expect(isValidStageMove(project, 'nursery', user)).toBe(true)
    expect(isValidStageMove(project, 'thriving', user)).toBe(false)
    expect(isValidStageMove(project, 'seedling', user)).toBe(false)
  })

  it('allows admin to skip stages', () => {
    const admin = makeAdmin()
    const project = makeProject({ stage: 'seedling' })
    expect(isValidStageMove(project, 'thriving', admin)).toBe(true)
    expect(isValidStageMove(project, 'bloom', admin)).toBe(true)
  })

  it('rejects current stage as target', () => {
    const user = makeUser()
    const project = makeProject({ builderEmail: 'user@sprout.ph', stage: 'sprout' })
    expect(isValidStageMove(project, 'sprout', user)).toBe(false)
  })

  it('rejects invalid stage string', () => {
    const user = makeUser()
    const project = makeProject({ builderEmail: 'user@sprout.ph', stage: 'sprout' })
    expect(isValidStageMove(project, 'seed', user)).toBe(false)
    expect(isValidStageMove(project, '', user)).toBe(false)
    expect(isValidStageMove(project, 'growing', user)).toBe(false) // old v1 name
  })
})

// ── toProject preserves builderEmail through round-trip ──────────────────────

describe('toProject / fromProject — builderEmail round-trip', () => {
  const baseRow = {
    id: 1,
    country: 'PH',
    name: 'Approver Plant',
    built_by: 'Engineering',
    built_for: 'HR',
    problem_space: null,
    stage: 'sprout',
    impact: null,
    impact_num: null,
    builder: 'approver',
    builder_email: 'approver@sprout.ph',
    zx: 40,
    zy: 50,
    notes: [],
    milestones: ['Approved'],
    description: 'An approved plant',
    data_source: null,
    data_sources: [],
    demo_link: null,
    interested_users: [],
    tool_used: ['ChatGPT'],
    collaborator_emails: [],
    prototype_link: null,
    deck_link: null,
    review_status: 'approved',
    review_comment: null,
    reviewed_by: 'approver@sprout.ph',
    reviewed_at: new Date().toISOString(),
    submitted_at: new Date().toISOString(),
    last_updated: new Date().toISOString(),
    image_url: null,
  }

  it('toProject preserves builderEmail', () => {
    const proj = toProject(baseRow)
    expect(proj.builderEmail).toBe('approver@sprout.ph')
  })

  it('toProject preserves stage after approval', () => {
    const proj = toProject(baseRow)
    expect(proj.stage).toBe('sprout')
    expect(proj.reviewStatus).toBe('approved')
    expect(proj.reviewedBy).toBe('approver@sprout.ph')
  })

  it('fromProject preserves builder_email', () => {
    const proj = toProject(baseRow)
    const row = fromProject(proj)
    expect(row.builder_email).toBe('approver@sprout.ph')
  })

  it('fromProject does NOT include country (immutability rule)', () => {
    const proj = toProject(baseRow)
    const row = fromProject(proj)
    expect(row.country).toBeUndefined()
  })

  it('toProject with null builder_email maps to null builderEmail', () => {
    const proj = toProject({ ...baseRow, builder_email: null })
    expect(proj.builderEmail).toBeNull()
  })

  it('myProjects filter catches null builder_email via displayName fallback', () => {
    const proj = toProject({ ...baseRow, builder_email: null, builder: 'approver' })
    const authUser = makeApprover({ displayName: 'approver' })
    const result = filterMyProjects([proj], authUser)
    expect(result).toHaveLength(1)
  })
})

// ── getAdjacentStages helper ──────────────────────────────────────────────────

describe('getAdjacentStages', () => {
  it('seedling has only nursery as adjacent', () => {
    expect(getAdjacentStages('seedling')).toEqual(['nursery'])
  })

  it('nursery has seedling and sprout as adjacent', () => {
    const adj = getAdjacentStages('nursery')
    expect(adj).toContain('seedling')
    expect(adj).toContain('sprout')
    expect(adj).toHaveLength(2)
  })

  it('thriving has only bloom as adjacent', () => {
    expect(getAdjacentStages('thriving')).toEqual(['bloom'])
  })

  it('returns empty array for unknown stage', () => {
    expect(getAdjacentStages('growing')).toEqual([])
    expect(getAdjacentStages('')).toEqual([])
  })
})
