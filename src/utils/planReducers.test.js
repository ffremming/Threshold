import { describe, it, expect } from 'vitest'
import {
  upsertBand, removeBand, upsertNote, removeNote, upsertGoal, removeGoal,
  upsertWeekTarget, removeWeekTarget, setPlanSettings,
  normalizePlan, normalizeNote, appendNoteMessage, markNoteRead, noteHasUnread,
} from './planReducers'

const NOW = 1000

describe('normalizePlan', () => {
  it('fills missing arrays', () => {
    expect(normalizePlan(undefined)).toEqual({ bands: [], notes: [], goals: [], weekTargets: [], planSettings: null })
    expect(normalizePlan({ bands: [{ id: 'a' }] }))
      .toEqual({ bands: [{ id: 'a' }], notes: [], goals: [], weekTargets: [], planSettings: null })
  })
})

describe('upsert reducers', () => {
  it('appends a new item with timestamps', () => {
    const next = upsertBand({ bands: [] }, { id: 'b1', type: 'taper' }, NOW)
    expect(next).toHaveLength(1)
    expect(next[0]).toMatchObject({ id: 'b1', type: 'taper', createdAt: NOW, updatedAt: NOW })
  })
  it('updates an existing item, preserving createdAt and bumping updatedAt', () => {
    const start = { bands: [{ id: 'b1', type: 'taper', createdAt: 1, updatedAt: 1 }] }
    const next = upsertBand(start, { id: 'b1', label: 'Renamed' }, NOW)
    expect(next).toHaveLength(1)
    expect(next[0]).toMatchObject({ id: 'b1', type: 'taper', label: 'Renamed', createdAt: 1, updatedAt: NOW })
  })
  it('does not mutate the input array', () => {
    const start = { bands: [{ id: 'b1' }] }
    const next = upsertBand(start, { id: 'b2' }, NOW)
    expect(start.bands).toHaveLength(1)
    expect(next).toHaveLength(2)
  })
  it('works for notes and goals too', () => {
    expect(upsertNote({ notes: [] }, { id: 'n1', body: 'hi' }, NOW)[0].body).toBe('hi')
    expect(upsertGoal({ goals: [] }, { id: 'g1', name: 'Race' }, NOW)[0].name).toBe('Race')
  })
})

describe('band conflict rules', () => {
  const buildup = { id: 'old', type: 'buildup', startDate: '2026-06-08', endDate: '2026-06-14' }

  it('a new same-kind (phase) band evicts an overlapping one', () => {
    const taper = { id: 'new', type: 'taper', startDate: '2026-06-12', endDate: '2026-06-18' }
    const next = upsertBand({ bands: [buildup] }, taper, NOW)
    expect(next.map(b => b.id)).toEqual(['new']) // buildup gone, taper present
  })

  it('keeps a same-kind band that does NOT overlap', () => {
    const taper = { id: 'new', type: 'taper', startDate: '2026-06-20', endDate: '2026-06-25' }
    const next = upsertBand({ bands: [buildup] }, taper, NOW)
    expect(next.map(b => b.id).sort()).toEqual(['new', 'old'])
  })

  it('lets a different-kind (focus) band coexist over the same dates', () => {
    const vo2 = { id: 'new', type: 'vo2max', startDate: '2026-06-08', endDate: '2026-06-14' }
    const next = upsertBand({ bands: [buildup] }, vo2, NOW)
    expect(next.map(b => b.id).sort()).toEqual(['new', 'old'])
  })

  it('editing a band in place does not evict itself', () => {
    const next = upsertBand({ bands: [buildup] }, { ...buildup, label: 'Base' }, NOW)
    expect(next).toHaveLength(1)
    expect(next[0]).toMatchObject({ id: 'old', label: 'Base' })
  })

  it('two custom bands conflict with each other on overlap', () => {
    const c1 = { id: 'c1', type: 'custom', startDate: '2026-06-08', endDate: '2026-06-12' }
    const c2 = { id: 'c2', type: 'custom', startDate: '2026-06-10', endDate: '2026-06-15' }
    const next = upsertBand({ bands: [c1] }, c2, NOW)
    expect(next.map(b => b.id)).toEqual(['c2'])
  })
})

describe('note dialogue thread', () => {
  it('normalizeNote lifts a legacy body into a single-message thread', () => {
    const n = normalizeNote({ id: 'n1', body: 'hello', author: 'coach', createdAt: 5 })
    expect(n.messages).toHaveLength(1)
    expect(n.messages[0]).toMatchObject({ author: 'coach', body: 'hello', createdAt: 5 })
  })

  it('normalizeNote leaves an already-threaded note untouched', () => {
    const threaded = { id: 'n1', messages: [{ id: 'm1', author: 'coach', body: 'hi', createdAt: 1 }] }
    expect(normalizeNote(threaded)).toBe(threaded)
  })

  it('appendNoteMessage adds to the thread, updates body, marks author read', () => {
    const start = { id: 'n1', author: 'coach', body: 'first', createdAt: 1 }
    const next = appendNoteMessage(start, { id: 'm2', author: 'athlete', body: 'reply', createdAt: 10 })
    expect(next.messages.map(m => m.body)).toEqual(['first', 'reply'])
    expect(next.body).toBe('reply')
    expect(next.readState.athlete).toBe(10)
  })

  it('noteHasUnread is true for a message from the OTHER author after last read', () => {
    const note = {
      id: 'n1', readState: { coach: 5, athlete: 8 },
      messages: [
        { id: 'm1', author: 'coach', body: 'a', createdAt: 1 },
        { id: 'm2', author: 'athlete', body: 'b', createdAt: 8 },
      ],
    }
    expect(noteHasUnread(note, 'coach')).toBe(true)   // athlete's msg (8) newer than coach read (5)
    expect(noteHasUnread(note, 'athlete')).toBe(false) // athlete read through 8, own latest msg
  })

  it('markNoteRead clears unread for the viewer', () => {
    const note = { id: 'n1', messages: [{ id: 'm2', author: 'athlete', body: 'b', createdAt: 8 }] }
    expect(noteHasUnread(note, 'coach')).toBe(true)
    const read = markNoteRead(note, 'coach', 9)
    expect(noteHasUnread(read, 'coach')).toBe(false)
  })
})

describe('remove reducers', () => {
  it('removes by id', () => {
    expect(removeBand({ bands: [{ id: 'a' }, { id: 'b' }] }, 'a')).toEqual([{ id: 'b' }])
    expect(removeNote({ notes: [{ id: 'n' }] }, 'n')).toEqual([])
    expect(removeGoal({ goals: [{ id: 'g' }] }, 'x')).toEqual([{ id: 'g' }])
  })
})

describe('week targets', () => {
  it('normalizePlan includes weekTargets and planSettings, tolerating legacy docs', () => {
    expect(normalizePlan({ weekTargets: [{ id: 't' }], planSettings: { rampPct: 5 } }))
      .toMatchObject({ weekTargets: [{ id: 't' }], planSettings: { rampPct: 5 } })
  })

  it('upsertWeekTarget collapses duplicates on (week, year)', () => {
    const plan = { weekTargets: [{ id: 'a', week: 3, year: 2026, distanceKm: 10 }] }
    const next = upsertWeekTarget(plan, { id: 'b', week: 3, year: 2026, distanceKm: 20 }, NOW)
    expect(next).toHaveLength(1)
    expect(next[0]).toMatchObject({ id: 'b', distanceKm: 20 })
  })

  it('upsertWeekTarget updates the same id in place', () => {
    const plan = { weekTargets: [{ id: 'a', week: 3, year: 2026, distanceKm: 10 }] }
    const next = upsertWeekTarget(plan, { id: 'a', week: 3, year: 2026, distanceKm: 99 }, NOW)
    expect(next).toHaveLength(1)
    expect(next[0]).toMatchObject({ id: 'a', distanceKm: 99, updatedAt: NOW })
  })

  it('removeWeekTarget drops by id', () => {
    const plan = { weekTargets: [{ id: 'a' }, { id: 'b' }] }
    expect(removeWeekTarget(plan, 'a')).toEqual([{ id: 'b' }])
  })

  it('setPlanSettings merges patch onto existing settings', () => {
    expect(setPlanSettings({ planSettings: null }, { rampPct: 8 }, NOW))
      .toMatchObject({ rampPct: 8, updatedAt: NOW })
    expect(setPlanSettings({ planSettings: { rampPct: 5, deloadPct: 60 } }, { rampPct: 8 }, NOW))
      .toMatchObject({ rampPct: 8, deloadPct: 60, updatedAt: NOW })
  })
})
