import { describe, it, expect, vi } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { usePlanTargets } from './usePlanTargets'

const weeks = [
  { week: 1, year: 2026, monday: new Date('2026-01-05'), sunday: new Date('2026-01-11'), key: '2026-01' },
  { week: 2, year: 2026, monday: new Date('2026-01-12'), sunday: new Date('2026-01-18'), key: '2026-02' },
]

const baseProps = (over = {}) => ({
  plan: { bands: [], notes: [], goals: [], weekTargets: [], planSettings: null },
  planActions: { upsertWeekTarget: vi.fn(), removeWeekTarget: vi.fn(), setPlanSettings: vi.fn() },
  overviewWeeks: weeks,
  overviewWorkoutsByWeekKey: { '2026-01': [], '2026-02': [] },
  templates: [{
    id: 'r', title: 'Run', activityTag: 'run', type: 'continuous', intensityZone: [2],
    blocks: { sections: [{ kind: 'steady', distanceKm: 10, durationMin: 60 }] },
  }],
  onAddManySessions: vi.fn(),
  resolveMuscles: () => [],
  ...over,
})

describe('usePlanTargets', () => {
  it('setTarget upserts a week target with the patch + ids', () => {
    const props = baseProps()
    const { result } = renderHook(() => usePlanTargets(props))
    act(() => result.current.setTarget(1, 2026, { distanceKm: 30, base: true }))
    expect(props.planActions.upsertWeekTarget).toHaveBeenCalledWith(
      expect.objectContaining({ week: 1, year: 2026, distanceKm: 30, base: true, id: expect.any(String) }),
    )
  })

  it('setDayTag merges into the week target dayTags', () => {
    const props = baseProps({
      plan: { bands: [], notes: [], goals: [], weekTargets: [{ id: 'a', week: 1, year: 2026, dayTags: {} }], planSettings: null },
    })
    const { result } = renderHook(() => usePlanTargets(props))
    act(() => result.current.setDayTag(1, 2026, 3, 'hard'))
    expect(props.planActions.upsertWeekTarget).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'a', dayTags: { 3: 'hard' } }),
    )
  })

  it('generate solves selected weeks and calls onAddManySessions with placements', () => {
    const props = baseProps({
      plan: {
        bands: [], notes: [], goals: [], planSettings: null,
        weekTargets: [{ id: 'a', week: 1, year: 2026, base: true, distanceKm: 20, durationMin: 120, distribution: null, qualities: [], dayTags: {} }],
      },
    })
    const { result } = renderHook(() => usePlanTargets(props))
    act(() => result.current.generate([{ week: 1, year: 2026 }]))
    expect(props.onAddManySessions).toHaveBeenCalled()
    const items = props.onAddManySessions.mock.calls[0][0]
    expect(items.length).toBeGreaterThan(0)
    expect(items[0]).toMatchObject({ week: 1, year: 2026, weekday: expect.any(Number) })
  })

  it('generate with no targeted weeks adds nothing', () => {
    const props = baseProps()
    const { result } = renderHook(() => usePlanTargets(props))
    act(() => result.current.generate([{ week: 1, year: 2026 }]))
    expect(props.onAddManySessions).not.toHaveBeenCalled()
  })
})
