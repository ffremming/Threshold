import { describe, it, expect, vi, beforeEach } from 'vitest'

const ops = []
let newId = 0
const fakeBatch = {
  set: (ref, data, opts) => ops.push({ kind: 'set', id: ref.__id, data, opts }),
  update: (ref, data) => ops.push({ kind: 'update', id: ref.__id, data }),
  commit: vi.fn(async () => {}),
}

vi.mock('firebase/firestore', () => ({
  writeBatch: () => fakeBatch,
  // doc(collection()) → new ref; doc(db, col, id) → existing ref.
  doc: (a, _col, id) => (id != null ? { __id: id } : { __id: a?.__newId ?? `new-${newId}` }),
  collection: () => ({ __newId: `new-${++newId}` }),
  serverTimestamp: () => 'TS',
}))
vi.mock('../../firebase', () => ({ db: {} }))
vi.mock('../../security/rateLimits', () => ({
  withDatabaseWriteLimit: (_label, fn) => fn(),
}))

import { createTemplateInsertActions } from './templateInsertActions'

const OVERVIEW = [
  // An existing session in week 23 / Thursday we will insert before/after.
  { id: 't1', week: 23, year: 2026, weekday: 4, order: 1, time: '07:00' },
]

beforeEach(() => { ops.length = 0; newId = 0; fakeBatch.commit.mockClear() })

describe('addTemplateToDayAcross (cross-week template insert)', () => {
  it('creates the workout in the target week/year/weekday and commits', async () => {
    const { addTemplateToDayAcross } = createTemplateInsertActions({
      selectedAthleteId: 'ath1', currentWeek: 20, currentYear: 2026,
      workouts: [], overviewWorkouts: OVERVIEW,
    })

    await addTemplateToDayAcross(
      { id: 'tmpl', title: 'Intervals', type: 'interval', intensityZone: [4] },
      23, 2026, 4 /* Thu */, null,
    )

    expect(fakeBatch.commit).toHaveBeenCalledOnce()
    const created = ops.find(op => op.kind === 'set')
    expect(created).toBeTruthy()
    expect(created.data).toMatchObject({ week: 23, year: 2026, weekday: 4, athleteId: 'ath1' })
    expect(created.data.date).toBe('2026-06-04') // Thu of ISO week 23, 2026
  })
})
