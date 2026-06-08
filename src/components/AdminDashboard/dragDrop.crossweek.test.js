import { describe, it, expect, vi, beforeEach } from 'vitest'

// Record batch operations instead of touching Firestore.
const ops = []
const fakeBatch = {
  set: (ref, data, opts) => ops.push({ kind: 'set', id: ref.__id, data, opts }),
  update: (ref, data) => ops.push({ kind: 'update', id: ref.__id, data }),
  commit: vi.fn(async () => {}),
}

vi.mock('firebase/firestore', () => ({
  writeBatch: () => fakeBatch,
  doc: (_db, _col, id) => ({ __id: id }),
  collection: () => ({}),
  serverTimestamp: () => 'TS',
}))
vi.mock('../../firebase', () => ({ db: {} }))
vi.mock('../../security/rateLimits', () => ({
  withDatabaseWriteLimit: (_label, fn) => fn(),
}))

import { createMoveActions } from './dragDrop'

const OVERVIEW = [
  // Week 21 Monday (weekday 1): one session we will move.
  { id: 'm1', week: 21, year: 2026, weekday: 1, order: 1, time: '08:00' },
  // Week 23 Thursday (weekday 4): one existing session.
  { id: 't1', week: 23, year: 2026, weekday: 4, order: 1, time: '07:00' },
]

beforeEach(() => { ops.length = 0; fakeBatch.commit.mockClear() })

describe('moveWorkoutAcross (cross-week)', () => {
  it('moves a session from (W21, Mon) to (W23, Thu) and re-orders both days', async () => {
    const { moveWorkoutAcross } = createMoveActions({
      workouts: [], overviewWorkouts: OVERVIEW, currentWeek: 21, currentYear: 2026,
    })

    await moveWorkoutAcross('m1', 23, 2026, 4 /* Thu */, null)

    expect(fakeBatch.commit).toHaveBeenCalledOnce()

    // The moved doc is rewritten into week 23 / Thursday with a fresh date.
    const moved = ops.find(op => op.id === 'm1')
    expect(moved.data).toMatchObject({ week: 23, year: 2026, weekday: 4 })
    expect(moved.data.date).toBe('2026-06-04') // Thu of ISO week 23, 2026
    expect(moved.data.order).toBe(2) // appended after existing t1

    // The existing target-day session keeps order 1.
    const target = ops.find(op => op.id === 't1')
    expect(target.data.order).toBe(1)
  })

  it('is a no-op when dropped on its own position', async () => {
    const { moveWorkoutAcross } = createMoveActions({
      workouts: [], overviewWorkouts: OVERVIEW, currentWeek: 21, currentYear: 2026,
    })
    await moveWorkoutAcross('m1', 21, 2026, 1, 'm1')
    expect(fakeBatch.commit).not.toHaveBeenCalled()
  })
})
