import { describe, it, expect, vi } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useQuickBuild } from './useQuickBuild'

const weeks = [
  { week: 1, year: 2026, monday: new Date('2026-01-05'), sunday: new Date('2026-01-11'), key: '2026-01' },
  { week: 2, year: 2026, monday: new Date('2026-01-12'), sunday: new Date('2026-01-18'), key: '2026-02' },
]

const baseProps = (over = {}) => ({
  plan: { bands: [], notes: [], goals: [], weekTargets: [], planSettings: null },
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

describe('useQuickBuild', () => {
  it('generates across selected weeks from a single start volume + ramp', () => {
    const props = baseProps()
    const { result } = renderHook(() => useQuickBuild(props))
    act(() => result.current.generate(
      [{ week: 1, year: 2026 }, { week: 2, year: 2026 }],
      { startVolume: 60, unit: 'time', rampPct: 10 },
    ))
    expect(props.onAddManySessions).toHaveBeenCalled()
    const items = props.onAddManySessions.mock.calls[0][0]
    expect(items.length).toBeGreaterThan(0)
    // both weeks targeted
    expect(items.some(i => i.week === 1)).toBe(true)
    expect(items.some(i => i.week === 2)).toBe(true)
    expect(items[0]).toMatchObject({ week: expect.any(Number), year: 2026, weekday: expect.any(Number) })
  })

  it('uses distance as the volume unit when chosen', () => {
    const props = baseProps()
    const { result } = renderHook(() => useQuickBuild(props))
    act(() => result.current.generate(
      [{ week: 1, year: 2026 }],
      { startVolume: 30, unit: 'distance', rampPct: 0 },
    ))
    const items = props.onAddManySessions.mock.calls[0][0]
    const dist = items.reduce((s, i) => s + (i.session.distance ?? i.session.blocks?.sections?.[0]?.distanceKm ?? 0), 0)
    expect(dist).toBeGreaterThanOrEqual(20) // ~30km from 10km templates
  })

  it('counts existing sessions toward the target (builds around them)', () => {
    const props = baseProps({
      overviewWorkoutsByWeekKey: {
        '2026-01': [{ id: 'e', title: 'Easy', activityTag: 'run', weekday: 1, week: 1, year: 2026, blocks: { sections: [{ kind: 'steady', distanceKm: 10, durationMin: 60 }] } }],
        '2026-02': [],
      },
    })
    const { result } = renderHook(() => useQuickBuild(props))
    act(() => result.current.generate([{ week: 1, year: 2026 }], { startVolume: 60, unit: 'time', rampPct: 0 }))
    const items = props.onAddManySessions.mock.calls[0]?.[0] || []
    // never places on the day that already has a session
    expect(items.every(i => i.weekday !== 1)).toBe(true)
  })

  it('does nothing for an empty selection', () => {
    const props = baseProps()
    const { result } = renderHook(() => useQuickBuild(props))
    act(() => result.current.generate([], { startVolume: 60, unit: 'time', rampPct: 10 }))
    expect(props.onAddManySessions).not.toHaveBeenCalled()
  })

  it('honors the activity distribution across the generated week', () => {
    const props = baseProps({
      templates: [
        { id: 'r', title: 'Run', activityTag: 'run', type: 'continuous', intensityZone: [2], blocks: { sections: [{ kind: 'steady', distanceKm: 10, durationMin: 60 }] } },
        { id: 'b', title: 'Bike', activityTag: 'bike', type: 'continuous', intensityZone: [2], blocks: { sections: [{ kind: 'steady', distanceKm: 30, durationMin: 60 }] } },
      ],
    })
    const { result } = renderHook(() => useQuickBuild(props))
    act(() => result.current.generate(
      [{ week: 1, year: 2026 }],
      { startVolume: 120, unit: 'time', rampPct: 0, distribution: { run: 50, bike: 50 } },
    ))
    const items = props.onAddManySessions.mock.calls[0][0]
    const tags = new Set(items.map(i => i.session.activityTag))
    expect(tags.has('run')).toBe(true)
    expect(tags.has('bike')).toBe(true)
  })

  it('caps hard sessions per week from the param', () => {
    const props = baseProps({
      templates: [
        { id: 'h', title: 'Intervals', activityTag: 'run', type: 'interval', intensityZone: [5], blocks: { sections: [{ kind: 'interval', distanceKm: 8, durationMin: 50, reps: 5 }] } },
        { id: 'e', title: 'Easy', activityTag: 'run', type: 'continuous', intensityZone: [2], blocks: { sections: [{ kind: 'steady', distanceKm: 10, durationMin: 60 }] } },
      ],
    })
    const { result } = renderHook(() => useQuickBuild(props))
    act(() => result.current.generate(
      [{ week: 1, year: 2026 }],
      { startVolume: 360, unit: 'time', rampPct: 0, qualityWeights: { vo2max: 1 }, hardPerWeek: 1 },
    ))
    const items = props.onAddManySessions.mock.calls[0][0]
    const hard = items.filter(i => (i.session.qualities || []).some(q => ['threshold', 'vo2max', 'speed', 'strength'].includes(q)))
    expect(hard.length).toBeLessThanOrEqual(1)
  })
})
