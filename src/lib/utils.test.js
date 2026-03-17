import { describe, it, expect } from 'vitest'
import { extractKeywords, countOverlap, getRelatedProjects, getActivityFeed } from './utils.js'

// ── extractKeywords ────────────────────────────────────────────────────────────

describe('extractKeywords', () => {
  it('filters words shorter than 4 chars', () => {
    const result = extractKeywords('cat dog automating processes')
    expect(result.has('cat')).toBe(false)
    expect(result.has('dog')).toBe(false)
    expect(result.has('automating')).toBe(true)
    expect(result.has('processes')).toBe(true)
  })

  it('filters stop words', () => {
    const result = extractKeywords('this project will help with automation')
    expect(result.has('this')).toBe(false)
    expect(result.has('will')).toBe(false)
    expect(result.has('with')).toBe(false)
    expect(result.has('help')).toBe(false)
    expect(result.has('project')).toBe(true)
    expect(result.has('automation')).toBe(true)
  })

  it('lowercases all tokens', () => {
    const result = extractKeywords('Machine Learning Pipeline')
    expect(result.has('machine')).toBe(true)
    expect(result.has('learning')).toBe(true)
    expect(result.has('pipeline')).toBe(true)
    expect(result.has('Machine')).toBe(false)
  })

  it('returns empty set for empty string', () => {
    expect(extractKeywords('').size).toBe(0)
  })

  it('returns empty set for null/undefined', () => {
    expect(extractKeywords(null).size).toBe(0)
    expect(extractKeywords(undefined).size).toBe(0)
  })

  it('handles punctuation by treating it as whitespace', () => {
    // After replacing non-alphanumeric with spaces: "expense tracking  invoice processing"
    const result = extractKeywords('expense-tracking, invoice.processing')
    expect(result.has('expense')).toBe(true)
    expect(result.has('tracking')).toBe(true)
    expect(result.has('invoice')).toBe(true)
    expect(result.has('processing')).toBe(true)
  })
})

// ── countOverlap ──────────────────────────────────────────────────────────────

describe('countOverlap', () => {
  it('returns 0 for empty strings', () => {
    expect(countOverlap('', '')).toBe(0)
    expect(countOverlap('hello world', '')).toBe(0)
    expect(countOverlap('', 'hello world')).toBe(0)
  })

  it('returns correct count for shared keywords', () => {
    const a = 'automate invoice processing system'
    const b = 'invoice processing automation tool'
    // shared: "automate"/"automation" - no, these differ; "invoice", "processing" are shared
    expect(countOverlap(a, b)).toBeGreaterThanOrEqual(2)
  })

  it('ignores short common words', () => {
    // Words like "the", "and", "or" (stop words) and words < 4 chars should not count
    expect(countOverlap('the cat and dog', 'the cat and dog')).toBe(0)
  })

  it('is case-insensitive', () => {
    const count1 = countOverlap('Machine Learning', 'machine learning')
    expect(count1).toBe(2)
  })

  it('counts each unique keyword once even if repeated', () => {
    // "data data data" should still only count "data" once against "data pipeline"
    const count = countOverlap('data data data system', 'data pipeline system')
    // "data" and "system" are shared — both > 3 chars, not stop words
    expect(count).toBe(2)
  })
})

// ── getRelatedProjects ────────────────────────────────────────────────────────

const makeProject = (overrides) => ({
  id: 'p1',
  name: 'Generic Project',
  description: 'Generic description',
  builtFor: 'Finance',
  dataSources: [],
  country: 'PH',
  stage: 'seedling',
  ...overrides,
})

describe('getRelatedProjects', () => {
  it('returns empty array when no projects', () => {
    const proj = makeProject({ id: 'p1' })
    expect(getRelatedProjects(proj, [])).toEqual([])
  })

  it('excludes the project itself', () => {
    const proj = makeProject({ id: 'p1', description: 'invoice automation system tool', name: 'Invoice Auto' })
    const result = getRelatedProjects(proj, [proj])
    expect(result).toEqual([])
  })

  it('matches on shared description keywords (score +3)', () => {
    const proj = makeProject({
      id: 'p1',
      description: 'automated invoice processing system for finance team',
      dataSources: [],
      country: 'PH',
    })
    const other = makeProject({
      id: 'p2',
      description: 'invoice processing automation workflow system',
      dataSources: [],
      country: 'PH',
    })
    const result = getRelatedProjects(proj, [other])
    // "invoice", "processing", "system" are shared (>= 2 overlap), score = 3
    expect(result.length).toBe(1)
    expect(result[0].id).toBe('p2')
    expect(result[0].score).toBeGreaterThanOrEqual(3)
    expect(result[0].matchReason).toContain('Similar description')
  })

  it('matches on shared data sources (score +3)', () => {
    const proj = makeProject({
      id: 'p1',
      description: 'short',
      dataSources: ['SAP', 'Salesforce'],
      country: 'PH',
    })
    const other = makeProject({
      id: 'p2',
      description: 'different text here',
      dataSources: ['SAP', 'Oracle'],
      country: 'PH',
    })
    const result = getRelatedProjects(proj, [other])
    expect(result.length).toBe(1)
    expect(result[0].matchReason).toContain('Shared data sources')
    expect(result[0].score).toBeGreaterThanOrEqual(3)
  })

  it('matches on same team (score +1, not enough alone to reach threshold)', () => {
    // Same team alone gives score=1, below threshold of 3
    const proj = makeProject({ id: 'p1', builtFor: 'Finance', dataSources: [], description: 'short' })
    const other = makeProject({ id: 'p2', builtFor: 'Finance', dataSources: [], description: 'different' })
    const result = getRelatedProjects(proj, [other])
    // score = 1 only (same team), below threshold of 3 — should NOT match
    expect(result).toEqual([])
  })

  it('does not match below threshold (score < 3)', () => {
    const proj = makeProject({
      id: 'p1',
      description: 'completely unrelated content',
      dataSources: [],
      builtFor: 'HR',
      country: 'PH',
    })
    const other = makeProject({
      id: 'p2',
      description: 'totally different subject matter here',
      dataSources: [],
      builtFor: 'Marketing',
      country: 'PH',
    })
    const result = getRelatedProjects(proj, [other])
    expect(result).toEqual([])
  })

  it('returns max 3 results', () => {
    const proj = makeProject({
      id: 'p0',
      description: 'invoice processing automation system workflow',
      dataSources: ['SAP'],
      country: 'PH',
    })
    const others = Array.from({ length: 5 }, (_, i) =>
      makeProject({
        id: `p${i + 1}`,
        description: 'invoice processing automation system workflow',
        dataSources: ['SAP'],
        country: 'PH',
      })
    )
    const result = getRelatedProjects(proj, others)
    expect(result.length).toBeLessThanOrEqual(3)
  })

  it('sorts by score descending', () => {
    const proj = makeProject({
      id: 'p0',
      description: 'invoice processing automation system workflow tool',
      dataSources: ['SAP'],
      builtFor: 'Finance',
      country: 'PH',
    })
    // high score: matching description + data source + team
    const highScore = makeProject({
      id: 'p1',
      description: 'invoice processing automation system workflow pipeline',
      dataSources: ['SAP'],
      builtFor: 'Finance',
      country: 'PH',
    })
    // lower score: matching description only
    const lowScore = makeProject({
      id: 'p2',
      description: 'invoice processing automation system workflow different',
      dataSources: [],
      builtFor: 'Marketing',
      country: 'PH',
    })
    const result = getRelatedProjects(proj, [lowScore, highScore])
    expect(result[0].score).toBeGreaterThanOrEqual(result[result.length - 1].score)
  })

  it('does not match projects from different countries', () => {
    const proj = makeProject({
      id: 'p1',
      description: 'invoice processing automation system workflow',
      dataSources: ['SAP'],
      country: 'PH',
    })
    const other = makeProject({
      id: 'p2',
      description: 'invoice processing automation system workflow',
      dataSources: ['SAP'],
      country: 'TH',
    })
    const result = getRelatedProjects(proj, [other])
    expect(result).toEqual([])
  })
})

// ── getActivityFeed ───────────────────────────────────────────────────────────

const makeWish = (overrides) => ({
  id: 'w1',
  title: 'Wish Title',
  fulfilledBy: null,
  claimedBy: null,
  upvoters: [],
  createdDaysAgo: 1,
  ...overrides,
})

const makeActivityProject = (overrides) => ({
  id: 'proj1',
  name: 'Test Project',
  builder: 'Alice',
  builderEmail: 'alice@sprout.ph',
  stage: 'seedling',
  milestones: [],
  lastUpdated: 2,
  ...overrides,
})

describe('getActivityFeed', () => {
  it('returns empty array for no data', () => {
    expect(getActivityFeed([], [])).toEqual([])
  })

  it('creates thriving event for thriving projects', () => {
    const proj = makeActivityProject({ stage: 'thriving', lastUpdated: 0 })
    const result = getActivityFeed([proj], [])
    expect(result[0].type).toBe('thriving')
    expect(result[0].text).toContain('Thriving')
  })

  it('creates nursery event for nursery projects', () => {
    const proj = makeActivityProject({ stage: 'nursery', lastUpdated: 0 })
    const result = getActivityFeed([proj], [])
    expect(result[0].type).toBe('nursery')
    expect(result[0].text).toContain('Nursery')
  })

  it('creates bloom event for bloom projects', () => {
    const proj = makeActivityProject({ stage: 'bloom', lastUpdated: 0 })
    const result = getActivityFeed([proj], [])
    expect(result[0].type).toBe('bloom')
    expect(result[0].text).toContain('Bloom')
  })

  it('creates sprout event for sprout projects', () => {
    const proj = makeActivityProject({ stage: 'sprout', lastUpdated: 0 })
    const result = getActivityFeed([proj], [])
    expect(result[0].type).toBe('sprout')
    expect(result[0].text).toContain('Sprout')
  })

  it('creates added event for seedling projects', () => {
    const proj = makeActivityProject({ stage: 'seedling', lastUpdated: 0 })
    const result = getActivityFeed([proj], [])
    expect(result[0].type).toBe('added')
    expect(result[0].text).toContain('added by')
  })

  it('creates seed event for unclaimed wishes', () => {
    const wish = makeWish({ claimedBy: null, fulfilledBy: null, createdDaysAgo: 0 })
    const result = getActivityFeed([], [wish])
    expect(result[0].type).toBe('seed')
    expect(result[0].text).toContain('New Seed')
  })

  it('creates claimed event for claimed wishes', () => {
    const wish = makeWish({ claimedBy: 'Bob', fulfilledBy: null, createdDaysAgo: 0 })
    const result = getActivityFeed([], [wish])
    expect(result[0].type).toBe('claimed')
    expect(result[0].text).toContain('claimed by Bob')
  })

  it('creates fulfilled event for fulfilled wishes', () => {
    const wish = makeWish({ fulfilledBy: 'proj1', createdDaysAgo: 0 })
    const result = getActivityFeed([], [wish])
    expect(result[0].type).toBe('fulfilled')
    expect(result[0].text).toContain('Seed fulfilled')
  })

  it('does not crash when wish has no upvoters array', () => {
    const wish = makeWish({ upvoters: undefined, claimedBy: null, fulfilledBy: null, createdDaysAgo: 0 })
    expect(() => getActivityFeed([], [wish])).not.toThrow()
    const result = getActivityFeed([], [wish])
    expect(result[0].type).toBe('seed')
    expect(result[0].text).toContain('0 upvotes')
  })

  it('returns max 10 events', () => {
    const projects = Array.from({ length: 8 }, (_, i) =>
      makeActivityProject({ id: `p${i}`, stage: 'seedling', lastUpdated: i })
    )
    const wishes = Array.from({ length: 8 }, (_, i) =>
      makeWish({ id: `w${i}`, createdDaysAgo: i })
    )
    const result = getActivityFeed(projects, wishes)
    expect(result.length).toBeLessThanOrEqual(10)
  })

  it('sorts newest first (lowest age first)', () => {
    const proj1 = makeActivityProject({ id: 'p1', stage: 'seedling', lastUpdated: 10 })
    const proj2 = makeActivityProject({ id: 'p2', stage: 'bloom', lastUpdated: 2 })
    const proj3 = makeActivityProject({ id: 'p3', stage: 'thriving', lastUpdated: 0 })
    const result = getActivityFeed([proj1, proj2, proj3], [])
    expect(result[0].age).toBeLessThanOrEqual(result[1].age)
    expect(result[1].age).toBeLessThanOrEqual(result[2].age)
  })

  it('includes project id prefixed with "p" in events', () => {
    const proj = makeActivityProject({ id: 'abc123', stage: 'seedling', lastUpdated: 0 })
    const result = getActivityFeed([proj], [])
    expect(result[0].id).toBe('pabc123')
  })

  it('uses milestone last entry to detect nursery when stage is seedling', () => {
    const proj = makeActivityProject({
      id: 'p1',
      stage: 'seedling',
      milestones: ['Started project', 'Submitted to Nursery'],
      lastUpdated: 0,
    })
    const result = getActivityFeed([proj], [])
    expect(result[0].type).toBe('nursery')
  })
})
