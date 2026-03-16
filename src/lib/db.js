import { supabase } from './supabase'

// ── Helpers ───────────────────────────────────────────────────────────────────

export const daysAgo = (ts) =>
  Math.floor((Date.now() - new Date(ts).getTime()) / 86400000)

// ── Row transforms ────────────────────────────────────────────────────────────

export const toProject = (row) => ({
  id:              row.id,
  country:         row.country,
  name:            row.name,
  builtBy:         row.built_by,
  builtFor:        row.built_for,
  area:            row.problem_space,
  stage:           row.stage,
  impact:          row.impact        || 'TBD',
  impactNum:       row.impact_num    || 'TBD',
  builder:         row.builder,
  builderEmail:    row.builder_email,
  zx:              row.zx,
  zy:              row.zy,
  notes:           row.notes          || [],
  milestones:      row.milestones     || [],
  description:     row.description,
  problemSpace:    row.problem_space,
  dataSource:      row.data_source,
  demoLink:        row.demo_link      || '',
  interestedUsers: row.interested_users || [],
  imageUrl:        row.image_url      || '',
  toolUsed:        row.tool_used      || [],
  prototypeLink:   row.prototype_link  || null,
  deckLink:        row.deck_link       || null,
  reviewStatus:    row.review_status   || null,
  reviewComment:   row.review_comment  || null,
  reviewedBy:      row.reviewed_by     || null,
  reviewedAt:      row.reviewed_at     || null,
  submittedAt:     row.submitted_at    || null,
  lastUpdated:     daysAgo(row.last_updated),
})

export const fromProject = (proj) => ({
  country:          proj.country,
  name:             proj.name,
  built_by:         proj.builtBy,
  built_for:        proj.builtFor,
  stage:            proj.stage,
  impact:           proj.impact,
  impact_num:       proj.impactNum,
  builder:          proj.builder,
  builder_email:    proj.builderEmail,
  zx:               Math.round(proj.zx  || 40),
  zy:               Math.round(proj.zy  || 50),
  notes:            proj.notes           || [],
  milestones:       proj.milestones      || [],
  description:      proj.description,
  problem_space:    proj.area ?? proj.problemSpace,
  data_source:      proj.dataSource,
  demo_link:        proj.demoLink        || '',
  interested_users: proj.interestedUsers || [],
  image_url:        proj.imageUrl        || '',
  tool_used:        proj.toolUsed        || [],
  prototype_link:   proj.prototypeLink  ?? null,
  deck_link:        proj.deckLink       ?? null,
  last_updated:     new Date().toISOString(),
})

export const toWish = (row) => ({
  id:              row.id,
  country:         row.country,
  title:           row.title,
  why:             row.why,
  builtFor:        row.built_for,
  wisherName:      row.wisher_name,
  wisherEmail:     row.wisher_email,
  upvoters:        row.upvoters        || [],
  fulfilledBy:     row.fulfilled_by    || null,
  claimedBy:       row.claimed_by      || null,
  claimedByEmail:  row.claimed_by_email|| null,
  claimedAt:       row.claimed_at      || null,
  readyForReview:  row.ready_for_review|| false,
  prototypeLink:   row.prototype_link  || null,
  prototypeNote:   row.prototype_note  || null,
  createdDaysAgo:  daysAgo(row.created_at),
})

export const fromWish = (wish) => ({
  id:               wish.id,
  country:          wish.country,
  title:            wish.title,
  why:              wish.why             || '',
  built_for:        wish.builtFor,
  wisher_name:      wish.wisherName,
  wisher_email:     wish.wisherEmail,
  upvoters:         wish.upvoters        || [],
  fulfilled_by:     wish.fulfilledBy     || null,
  claimed_by:       wish.claimedBy       || null,
  claimed_by_email: wish.claimedByEmail  || null,
  claimed_at:       wish.claimedAt       || null,
  ready_for_review: wish.readyForReview  || false,
  prototype_link:   wish.prototypeLink   || null,
  prototype_note:   wish.prototypeNote   || null,
})

// ── Queries ───────────────────────────────────────────────────────────────────

export const loadProjects = async () => {
  const { data, error } = await supabase
    .from('projects').select('*').order('created_at', { ascending: true })
  if (error) { console.error('loadProjects:', error); return [] }
  return data.map(toProject)
}

export const loadWishes = async () => {
  const { data, error } = await supabase
    .from('wishes').select('*').order('created_at', { ascending: false })
  if (error) { console.error('loadWishes:', error); return [] }
  return data.map(toWish)
}

export const loadNotifications = async () => {
  const { data, error } = await supabase
    .from('notifications')
    .select('*')
    .order('created_at', { ascending: false })
  if (error) { console.error('loadNotifications:', error); return [] }
  return data
}
