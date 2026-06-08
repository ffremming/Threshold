import { describe, it, expect, vi, beforeEach } from 'vitest'

const onSnapshot = vi.fn()
const collection = vi.fn((_db, name) => ({ __col: name }))
const query = vi.fn((...args) => ({ __query: args }))
const where = vi.fn((field, op, value) => ({ field, op, value }))

vi.mock('firebase/firestore', () => ({
  onSnapshot: (...args) => onSnapshot(...args),
  collection: (...args) => collection(...args),
  query: (...args) => query(...args),
  where: (...args) => where(...args),
  doc: vi.fn(),
  setDoc: vi.fn(),
  getDocs: vi.fn(),
  deleteDoc: vi.fn(),
  serverTimestamp: vi.fn(),
}))
vi.mock('../firebase', () => ({ db: {} }))
vi.mock('../security/rateLimits', () => ({ withDatabaseWriteLimit: (_k, fn) => fn() }))

import { onCoachesSnapshot } from './relationships'

describe('onCoachesSnapshot', () => {
  beforeEach(() => { onSnapshot.mockReset(); where.mockClear() })

  it('queries active coaches and normalizes docs', () => {
    const cb = vi.fn()
    onSnapshot.mockImplementation((_q, handler) => {
      handler({
        docs: [
          { id: 'c1', data: () => ({ uid: 'c1', displayName: 'Coach One', roles: ['coach'], status: 'active' }) },
        ],
      })
      return () => {}
    })

    onCoachesSnapshot(cb)

    expect(where).toHaveBeenCalledWith('roles', 'array-contains', 'coach')
    expect(cb).toHaveBeenCalledWith([
      expect.objectContaining({ uid: 'c1', displayName: 'Coach One', status: 'active' }),
    ])
  })

  it('filters out non-active coaches', () => {
    const cb = vi.fn()
    onSnapshot.mockImplementation((_q, handler) => {
      handler({
        docs: [
          { id: 'c1', data: () => ({ uid: 'c1', roles: ['coach'], status: 'active' }) },
          { id: 'c2', data: () => ({ uid: 'c2', roles: ['coach'], status: 'disabled' }) },
        ],
      })
      return () => {}
    })

    onCoachesSnapshot(cb)
    expect(cb).toHaveBeenCalledWith([expect.objectContaining({ uid: 'c1' })])
  })
})
