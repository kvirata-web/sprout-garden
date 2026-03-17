import { describe, it, expect, vi } from 'vitest'

vi.mock('./supabase', () => ({ supabase: {} }))

import { toProject, fromProject, daysAgo } from './db.js'

// ── daysAgo ───────────────────────────────────────────────────────────────────

describe('daysAgo', () => {
  it('returns 0 for current timestamp', () => {
    const now = new Date().toISOString()
    expect(daysAgo(now)).toBe(0)
  })

  it('returns 7 for a week ago', () => {
    const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString()
    expect(daysAgo(weekAgo)).toBe(7)
  })

  it('returns 1 for yesterday', () => {
    const yesterday = new Date(Date.now() - 1 * 86400000).toISOString()
    expect(daysAgo(yesterday)).toBe(1)
  })

  it('returns 30 for 30 days ago', () => {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000).toISOString()
    expect(daysAgo(thirtyDaysAgo)).toBe(30)
  })
})

// ── toProject ─────────────────────────────────────────────────────────────────

describe('toProject', () => {
  const baseRow = {
    id: '123',
    country: 'PH',
    name: 'Test Project',
    built_by: 'Engineering',
    built_for: 'Finance',
    problem_space: 'Automation',
    stage: 'seedling',
    impact: 'High',
    impact_num: '50%',
    builder: 'Alice',
    builder_email: 'alice@sprout.ph',
    zx: 40,
    zy: 50,
    notes: ['note1'],
    milestones: ['milestone1'],
    description: 'A test description',
    data_source: 'SAP',
    data_sources: ['SAP', 'Salesforce'],
    demo_link: 'https://demo.example.com',
    interested_users: ['bob@sprout.ph'],
    image_url: 'https://image.example.com',
    tool_used: ['ChatGPT'],
    collaborator_emails: ['bob@sprout.ph'],
    prototype_link: 'https://proto.example.com',
    deck_link: 'https://deck.example.com',
    review_status: 'pending',
    review_comment: 'Looks good',
    reviewed_by: 'admin@sprout.ph',
    reviewed_at: new Date().toISOString(),
    submitted_at: new Date().toISOString(),
    last_updated: new Date().toISOString(),
  }

  it('maps snake_case DB row to camelCase project', () => {
    const project = toProject(baseRow)
    expect(project.id).toBe('123')
    expect(project.country).toBe('PH')
    expect(project.name).toBe('Test Project')
    expect(project.builtBy).toBe('Engineering')
    expect(project.builtFor).toBe('Finance')
    expect(project.stage).toBe('seedling')
    expect(project.builder).toBe('Alice')
    expect(project.builderEmail).toBe('alice@sprout.ph')
    expect(project.description).toBe('A test description')
    expect(project.demoLink).toBe('https://demo.example.com')
    expect(project.reviewStatus).toBe('pending')
    expect(project.reviewComment).toBe('Looks good')
  })

  it('defaults toolUsed to [] when null', () => {
    const project = toProject({ ...baseRow, tool_used: null })
    expect(project.toolUsed).toEqual([])
  })

  it('defaults dataSources to [] when null', () => {
    const project = toProject({ ...baseRow, data_sources: null })
    expect(project.dataSources).toEqual([])
  })

  it('defaults notes to [] when null', () => {
    const project = toProject({ ...baseRow, notes: null })
    expect(project.notes).toEqual([])
  })

  it('defaults milestones to [] when null', () => {
    const project = toProject({ ...baseRow, milestones: null })
    expect(project.milestones).toEqual([])
  })

  it('defaults impact to "TBD" when null', () => {
    const project = toProject({ ...baseRow, impact: null })
    expect(project.impact).toBe('TBD')
  })

  it('defaults impactNum to "TBD" when null', () => {
    const project = toProject({ ...baseRow, impact_num: null })
    expect(project.impactNum).toBe('TBD')
  })

  it('defaults demoLink to empty string when null', () => {
    const project = toProject({ ...baseRow, demo_link: null })
    expect(project.demoLink).toBe('')
  })

  it('defaults collaboratorEmails to [] when null', () => {
    const project = toProject({ ...baseRow, collaborator_emails: null })
    expect(project.collaboratorEmails).toEqual([])
  })

  it('computes lastUpdated as a number (days ago)', () => {
    const project = toProject(baseRow)
    expect(typeof project.lastUpdated).toBe('number')
    expect(project.lastUpdated).toBe(0)
  })
})

// ── fromProject ───────────────────────────────────────────────────────────────

describe('fromProject', () => {
  const baseProject = {
    id: '123',
    country: 'PH',
    name: 'Test Project',
    builtBy: 'Engineering',
    builtFor: 'Finance',
    stage: 'seedling',
    impact: 'High',
    impactNum: '50%',
    builder: 'Alice',
    builderEmail: 'alice@sprout.ph',
    zx: 40,
    zy: 50,
    notes: ['note1'],
    milestones: ['milestone1'],
    description: 'A test description',
    area: 'Automation',
    problemSpace: 'Automation',
    dataSource: 'SAP',
    dataSources: ['SAP', 'Salesforce'],
    demoLink: 'https://demo.example.com',
    interestedUsers: ['bob@sprout.ph'],
    toolUsed: ['ChatGPT'],
    collaboratorEmails: ['bob@sprout.ph'],
    prototypeLink: 'https://proto.example.com',
    deckLink: 'https://deck.example.com',
  }

  it('maps camelCase project to snake_case DB row', () => {
    const row = fromProject(baseProject)
    expect(row.name).toBe('Test Project')
    expect(row.built_by).toBe('Engineering')
    expect(row.built_for).toBe('Finance')
    expect(row.stage).toBe('seedling')
    expect(row.builder).toBe('Alice')
    expect(row.builder_email).toBe('alice@sprout.ph')
    expect(row.description).toBe('A test description')
    expect(row.demo_link).toBe('https://demo.example.com')
    expect(row.tool_used).toEqual(['ChatGPT'])
    expect(row.data_sources).toEqual(['SAP', 'Salesforce'])
    expect(row.collaborator_emails).toEqual(['bob@sprout.ph'])
    expect(row.prototype_link).toBe('https://proto.example.com')
    expect(row.deck_link).toBe('https://deck.example.com')
  })

  it('does NOT include country field in output', () => {
    // country is immutable — must never be included in UPDATE payloads
    const row = fromProject(baseProject)
    expect(Object.prototype.hasOwnProperty.call(row, 'country')).toBe(false)
  })

  it('INSERT pattern: spreading country back in gives correct row for new records', () => {
    // addProject does: {...fromProject(proj), country: proj.country}
    const row = { ...fromProject(baseProject), country: baseProject.country }
    expect(row.country).toBe('PH')
    expect(row.name).toBe('Test Project')
  })

  it('defaults toolUsed to [] when undefined', () => {
    const row = fromProject({ ...baseProject, toolUsed: undefined })
    expect(row.tool_used).toEqual([])
  })

  it('defaults dataSources to [] when undefined', () => {
    const row = fromProject({ ...baseProject, dataSources: undefined })
    expect(row.data_sources).toEqual([])
  })

  it('defaults notes to [] when undefined', () => {
    const row = fromProject({ ...baseProject, notes: undefined })
    expect(row.notes).toEqual([])
  })

  it('defaults milestones to [] when undefined', () => {
    const row = fromProject({ ...baseProject, milestones: undefined })
    expect(row.milestones).toEqual([])
  })

  it('defaults interestedUsers to [] when undefined', () => {
    const row = fromProject({ ...baseProject, interestedUsers: undefined })
    expect(row.interested_users).toEqual([])
  })

  it('defaults collaboratorEmails to [] when undefined', () => {
    const row = fromProject({ ...baseProject, collaboratorEmails: undefined })
    expect(row.collaborator_emails).toEqual([])
  })

  it('rounds zx and zy values', () => {
    const row = fromProject({ ...baseProject, zx: 40.7, zy: 50.3 })
    expect(row.zx).toBe(41)
    expect(row.zy).toBe(50)
  })

  it('sets last_updated to a current ISO string', () => {
    const before = Date.now()
    const row = fromProject(baseProject)
    const after = Date.now()
    const rowTime = new Date(row.last_updated).getTime()
    expect(rowTime).toBeGreaterThanOrEqual(before)
    expect(rowTime).toBeLessThanOrEqual(after)
  })

  it('uses area field for problem_space when present', () => {
    const row = fromProject({ ...baseProject, area: 'Supply Chain', problemSpace: 'Automation' })
    expect(row.problem_space).toBe('Supply Chain')
  })

  it('falls back to problemSpace when area is nullish', () => {
    const row = fromProject({ ...baseProject, area: null, problemSpace: 'Operations' })
    expect(row.problem_space).toBe('Operations')
  })
})
