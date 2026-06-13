import { describe, it, expect, vi } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useQuickBuild } from './useQuickBuild'

const weeks = [
  { week: 1, year: 2026, monday: new Date('2026-01-05'), sunday: new Date('2026-01-11'), key: '2026-01' },
  { week: 2, year: 2026, monday: new Date('2026-01-12'), sunday: new Date('2026-01-18'), key: '2026-02' },
]

const runTpl = q => ({ id: `run-${q}`, title: `Run ${q}`, activityTag: 'run', type: 'continuous', intensityZone: [2], blocks: { sections: [{ kind: 'steady', distanceKm: 10, durationMin: 60 }] }, qualities: [q] })
const bikeTpl = q => ({ id: `bike-${q}`, title: `Bike ${q}`, activityTag: 'bike', type: 'continuous', intensityZone: [2], blocks: { sections: [{ kind: 'steady', distanceKm: 27, durationMin: 73 }] }, qualities: [q] })

const baseProps = (over = {}) => ({
  plan: { bands: [], notes: [], goals: [], weekTargets: [], planSettings: null },
  overviewWeeks: weeks,
  overviewWorkoutsByWeekKey: { '2026-01': [], '2026-02': [] },
  templates: [
    { id: 'r', title: 'Run', activityTag: 'run', type: 'continuous', intensityZone: [2], blocks: { sections: [{ kind: 'steady', distanceKm: 10, durationMin: 60 }] } },
  ],
  onAddManySessions: vi.fn(),
  resolveMuscles: () => [],
  ...over,
})

const lastItems = props => props.onAddManySessions.mock.calls[0]?.[0] || []

describe('useQuickBuild (per-activity)', () => {
  it('generates across selected weeks from per-activity targets + ramp', () => {
    const props = baseProps()
    const { result } = renderHook(() => useQuickBuild(props))
    act(() => result.current.generate(
      [{ week: 1, year: 2026 }, { week: 2, year: 2026 }],
      { activities: [{ tag: 'run', volume: 120, unit: 'time', hard: true }], rampPct: 10 },
    ))
    const items = lastItems(props)
    expect(items.length).toBeGreaterThan(0)
    expect(items.some(i => i.week === 1)).toBe(true)
    expect(items.some(i => i.week === 2)).toBe(true)
  })

  it('sizes a distance-specific activity by converting km to time (run ≈ 6 min/km)', () => {
    const props = baseProps()
    const { result } = renderHook(() => useQuickBuild(props))
    act(() => result.current.generate(
      [{ week: 1, year: 2026 }],
      { activities: [{ tag: 'run', volume: 30, unit: 'distance', hard: false }], rampPct: 0 },
    ))
    const items = lastItems(props)
    // 30 km run ≈ 180 min → about three 10km/60min templates
    const totalKm = items.reduce((s, i) => s + (i.session.distance ?? 10), 0)
    expect(totalKm).toBeGreaterThanOrEqual(20)
  })

  it('builds the activity split from multiple per-activity targets', () => {
    const props = baseProps({
      templates: [runTpl('endurance'), bikeTpl('endurance')],
    })
    const { result } = renderHook(() => useQuickBuild(props))
    act(() => result.current.generate(
      [{ week: 1, year: 2026 }],
      { activities: [
        { tag: 'run', volume: 120, unit: 'time', hard: true },
        { tag: 'bike', volume: 120, unit: 'time', hard: false },
      ], rampPct: 0 },
    ))
    const tags = new Set(lastItems(props).map(i => i.session.activityTag))
    expect(tags.has('run')).toBe(true)
    expect(tags.has('bike')).toBe(true)
  })

  it('caps total hard sessions at hardDays per week', () => {
    const props = baseProps({
      // a big single-week target with plenty of hard + easy candidates
      overviewWorkoutsByWeekKey: { '2026-01': [], '2026-02': [] },
      templates: [
        { id: 'rh', title: 'Intervals', activityTag: 'run', type: 'interval', intensityZone: [5], blocks: { sections: [{ kind: 'interval', distanceKm: 8, durationMin: 50, reps: 5 }] } },
        { id: 're', title: 'Easy run', activityTag: 'run', type: 'continuous', intensityZone: [2], blocks: { sections: [{ kind: 'steady', distanceKm: 12, durationMin: 72 }] } },
      ],
    })
    const { result } = renderHook(() => useQuickBuild(props))
    act(() => result.current.generate(
      [{ week: 1, year: 2026 }],
      { activities: [{ tag: 'run', volume: 420, unit: 'time' }], rampPct: 0, qualityWeights: { vo2max: 1 }, hardPerWeek: 2 },
    ))
    const items = lastItems(props)
    const hard = items.filter(i => (i.session.qualities || []).some(q => ['threshold', 'vo2max', 'speed', 'strength'].includes(q)))
    expect(hard.length).toBeLessThanOrEqual(2)
  })

  it('does nothing for an empty selection or no activities', () => {
    const props = baseProps()
    const { result } = renderHook(() => useQuickBuild(props))
    act(() => result.current.generate([], { activities: [{ tag: 'run', volume: 60, unit: 'time' }], rampPct: 0 }))
    act(() => result.current.generate([{ week: 1, year: 2026 }], { activities: [], rampPct: 0 }))
    expect(props.onAddManySessions).not.toHaveBeenCalled()
  })
})
