import { describe, it, expect, vi, beforeEach } from 'vitest'

const ops = []
let newId = 0
const fakeBatch = {
  set: (ref, data) => ops.push({ kind: 'set', id: ref.__id, data }),
  update: (ref, data) => ops.push({ kind: 'update', id: ref.__id, data }),
  delete: (ref) => ops.push({ kind: 'delete', id: ref.__id }),
  commit: vi.fn(async () => {}),
}

vi.mock('firebase/firestore', () => ({
  writeBatch: () => fakeBatch,
  // Real Firestore refs expose `.id`; mirror that (and keep __id for op records).
  doc: (a, _col, id) => {
    const ref = id != null ? id : `new-${++newId}`
    return { __id: ref, id: ref }
  },
  collection: () => ({}),
  serverTimestamp: () => 'TS',
}))
vi.mock('../../firebase', () => ({ db: {} }))
const withLimit = vi.fn((_scope, fn) => fn())
vi.mock('../../security/rateLimits', () => ({
  withDatabaseWriteLimit: (...args) => withLimit(...args),
}))

import { createTemplateInsertActions } from './templateInsertActions'
import { createMoveActions } from './dragDrop'

beforeEach(() => { ops.length = 0; newId = 0; fakeBatch.commit.mockClear(); withLimit.mockClear() })

describe('batched writes use a single rate-limited commit', () => {
  it('addManySessions writes all sessions in ONE commit', async () => {
    const { addManySessions } = createTemplateInsertActions({
      selectedAthleteId: 'a', currentWeek: 20, currentYear: 2026, workouts: [], overviewWorkouts: [],
    })
    await addManySessions([
      { session: { title: 'A', type: 'easy' }, week: 22, year: 2026, weekday: 4 },
      { session: { title: 'B', type: 'easy' }, week: 25, year: 2026, weekday: 4 },
      { session: { title: 'C', type: 'easy' }, week: 22, year: 2026, weekday: 4 },
    ])
    // One rate-limited commit total, not one per session.
    expect(withLimit).toHaveBeenCalledTimes(1)
    expect(fakeBatch.commit).toHaveBeenCalledTimes(1)
    const sets = ops.filter(o => o.kind === 'set')
    expect(sets).toHaveLength(3)
    // Two sessions land on the same day (W22 Thu) → orders 1 and 2.
    const w22 = sets.filter(s => s.data.week === 22).map(s => s.data.order).sort()
    expect(w22).toEqual([1, 2])
  })

  it('moveManyWorkouts moves all workouts in ONE commit', async () => {
    const overview = [
      { id: 'x1', week: 21, year: 2026, weekday: 1, order: 1 },
      { id: 'x2', week: 21, year: 2026, weekday: 2, order: 1 },
    ]
    const { moveManyWorkouts } = createMoveActions({
      workouts: [], overviewWorkouts: overview, currentWeek: 21, currentYear: 2026,
    })
    await moveManyWorkouts([
      { id: 'x1', week: 24, year: 2026, weekday: 4 },
      { id: 'x2', week: 24, year: 2026, weekday: 5 },
    ])
    expect(withLimit).toHaveBeenCalledTimes(1)
    expect(fakeBatch.commit).toHaveBeenCalledTimes(1)
    const updates = ops.filter(o => o.kind === 'update')
    expect(updates).toHaveLength(2)
    expect(updates.find(u => u.id === 'x1').data).toMatchObject({ week: 24, weekday: 4 })
    expect(updates.find(u => u.id === 'x2').data).toMatchObject({ week: 24, weekday: 5 })
  })
})

describe('undo registration', () => {
  it('paste registers an inverse that deletes the created sessions', async () => {
    let undoFn = null
    const pushUndo = fn => { undoFn = fn }
    const { addManySessions } = createTemplateInsertActions({
      selectedAthleteId: 'a', currentWeek: 20, currentYear: 2026, workouts: [], overviewWorkouts: [], pushUndo,
    })
    await addManySessions([
      { session: { title: 'A', type: 'easy' }, week: 22, year: 2026, weekday: 4 },
      { session: { title: 'B', type: 'easy' }, week: 22, year: 2026, weekday: 5 },
    ])
    const createdIds = ops.filter(o => o.kind === 'set').map(o => o.id)
    expect(typeof undoFn).toBe('function')

    ops.length = 0
    await undoFn()
    const deletes = ops.filter(o => o.kind === 'delete').map(o => o.id)
    expect(deletes.sort()).toEqual(createdIds.sort())
  })

  it('multi-move registers an inverse that restores prior positions', async () => {
    const overview = [
      { id: 'x1', week: 21, year: 2026, weekday: 1, order: 2, date: '2026-05-18' },
    ]
    let undoFn = null
    const { moveManyWorkouts } = createMoveActions({
      workouts: [], overviewWorkouts: overview, currentWeek: 21, currentYear: 2026,
      pushUndo: fn => { undoFn = fn },
    })
    await moveManyWorkouts([{ id: 'x1', week: 24, year: 2026, weekday: 4 }])
    expect(typeof undoFn).toBe('function')

    ops.length = 0
    await undoFn()
    const restore = ops.find(o => o.kind === 'update' && o.id === 'x1')
    expect(restore.data).toMatchObject({ week: 21, year: 2026, weekday: 1, order: 2 })
  })
})
