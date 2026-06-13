// Pure immutable array reducers for the per-athlete plan doc. Extracted from the
// usePlan hook so the upsert/remove logic is unit-testable without Firestore.
// Each function takes the current plan ({ bands, notes, goals }) and returns the
// next array for the relevant field. Timestamps are passed in (not generated)
// to keep these pure and deterministic.

import { bandKind } from './planTypes'
import { weekTargetKey } from './weekTargetTypes'

function upsertById(list, item, now) {
  const arr = Array.isArray(list) ? list : []
  const idx = arr.findIndex(x => x.id === item.id)
  if (idx === -1) {
    return [...arr, { ...item, createdAt: item.createdAt ?? now, updatedAt: now }]
  }
  const next = arr.slice()
  next[idx] = { ...arr[idx], ...item, updatedAt: now }
  return next
}

function removeById(list, id) {
  const arr = Array.isArray(list) ? list : []
  return arr.filter(x => x.id !== id)
}

// Two date ranges overlap if neither ends before the other starts (inclusive).
function rangesOverlap(aStart, aEnd, bStart, bEnd) {
  return aStart <= bEnd && bStart <= aEnd
}

// Upsert a band, enforcing conflict rules: bands of the SAME kind (phase /
// focus / marker) that overlap the new band's date range are mutually exclusive
// — the incoming band evicts them. Bands of a DIFFERENT kind coexist (stack).
// This lets, e.g., "buildup" replace an overlapping "taper" (both phases) while
// a "vo2max" focus laid over the same days survives. The band being edited
// never evicts itself.
export function upsertBand(plan, band, now) {
  const existing = Array.isArray(plan?.bands) ? plan.bands : []
  const kind = bandKind(band.type)
  const survivors = existing.filter(other => {
    if (other.id === band.id) return true // handled by upsertById
    if (bandKind(other.type) !== kind) return true // different kind → coexist
    return !rangesOverlap(band.startDate, band.endDate, other.startDate, other.endDate)
  })
  return upsertById(survivors, band, now)
}
export function removeBand(plan, id) {
  return removeById(plan?.bands, id)
}

export function upsertNote(plan, note, now) {
  return upsertById(plan?.notes, note, now)
}
export function removeNote(plan, id) {
  return removeById(plan?.notes, id)
}

export function upsertGoal(plan, goal, now) {
  return upsertById(plan?.goals, goal, now)
}
export function removeGoal(plan, id) {
  return removeById(plan?.goals, id)
}

// ── Week targets ─────────────────────────────────────────────────────
// One target per (week, year). Upsert collapses any existing target sharing the
// incoming target's week+year (other than the one being edited by id), so a
// week never carries two targets. Mirrors upsertGoal but with a composite key.
export function upsertWeekTarget(plan, target, now) {
  const existing = Array.isArray(plan?.weekTargets) ? plan.weekTargets : []
  const key = weekTargetKey(target.week, target.year)
  const survivors = existing.filter(
    t => t.id === target.id || weekTargetKey(t.week, t.year) !== key,
  )
  return upsertById(survivors, target, now)
}
export function removeWeekTarget(plan, id) {
  return removeById(plan?.weekTargets, id)
}

// Block-level ramp settings: a single object (not an array). Merge the patch
// onto the current settings and stamp updatedAt.
export function setPlanSettings(plan, patch, now) {
  const current = plan?.planSettings || {}
  return { ...current, ...patch, updatedAt: now }
}

// ── Note thread helpers ──────────────────────────────────────────────
// A note is a small dialogue: `messages` is the thread; `body` mirrors the
// latest message text so the collapsed post-it has a one-line preview without
// reading the array. `readState[author]` is the timestamp each participant last
// opened the thread, used to show the "new" dot.

// Back-compat: a legacy note has `body` but no `messages`. Lift it into a
// single-message thread so the rest of the code can assume `messages` exists.
export function normalizeNote(note) {
  if (!note) return note
  if (Array.isArray(note.messages) && note.messages.length > 0) return note
  const body = (note.body || '').trim()
  const messages = body
    ? [{ id: `${note.id}-m0`, author: note.author || 'coach', body, createdAt: note.createdAt || 0 }]
    : []
  return { ...note, messages }
}

// Append a message to a note's thread, returning the next note (immutably).
// Updates `body` to the new message's text and marks the author as caught-up.
export function appendNoteMessage(note, { id, author, body, createdAt }) {
  const base = normalizeNote(note)
  const text = (body || '').trim()
  if (!text) return base
  const message = { id, author, body: text, createdAt }
  return {
    ...base,
    messages: [...(base.messages || []), message],
    body: text,
    readState: { ...(base.readState || {}), [author]: createdAt },
  }
}

// Mark a viewer caught-up on a note's thread (opening it). `at` is the read time.
export function markNoteRead(note, viewer, at) {
  const base = normalizeNote(note)
  return { ...base, readState: { ...(base.readState || {}), [viewer]: at } }
}

// True if the note has any message from someone OTHER than the viewer that is
// newer than the viewer's last read — i.e. the viewer should see a "new" dot.
export function noteHasUnread(note, viewer) {
  const base = normalizeNote(note)
  const lastRead = base.readState?.[viewer] ?? 0
  return (base.messages || []).some(m => m.author !== viewer && (m.createdAt || 0) > lastRead)
}

// Normalize a raw plan doc (or undefined) into a stable shape with all arrays
// present, so consumers never have to null-check the fields.
export function normalizePlan(raw) {
  return {
    bands: Array.isArray(raw?.bands) ? raw.bands : [],
    notes: Array.isArray(raw?.notes) ? raw.notes : [],
    goals: Array.isArray(raw?.goals) ? raw.goals : [],
    weekTargets: Array.isArray(raw?.weekTargets) ? raw.weekTargets : [],
    planSettings: raw?.planSettings && typeof raw.planSettings === 'object' ? raw.planSettings : null,
  }
}
