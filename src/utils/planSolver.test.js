import { describe, it, expect } from 'vitest'
import { solveWeek } from './planSolver'

const cand = (id, activityTag, distance, duration, qualities = []) =>
  ({ id, template: { id, title: id, activityTag }, activityTag, distance, duration, qualities })

const EMPTY_TOTALS = { distance: 0, durationMin: 0, byActivity: {}, byQuality: {} }

describe('solveWeek', () => {
  it('reaches a volume target from the bank on empty days', () => {
    const target = { distanceKm: 30, durationMin: 180, distribution: null, qualities: [] }
    const candidates = [cand('a', 'run', 10, 60, ['endurance']), cand('b', 'run', 10, 60, ['endurance'])]
    const { placements, fit } = solveWeek(target, {
      existingTotals: EMPTY_TOTALS, candidates, dayTags: {}, maxAdds: 7,
    })
    const dist = placements.reduce((s, p) => s + p.session.distance, 0)
    expect(dist).toBeGreaterThanOrEqual(20)        // got close to 30 with 10km candidates
    expect(fit.distanceKm).toBeDefined()
  })

  it('counts existing sessions and only fills the gap', () => {
    const target = { distanceKm: 20, durationMin: 120, distribution: null, qualities: [] }
    const existingTotals = { distance: 15, durationMin: 90, byActivity: { run: { distance: 15, duration: 90 } }, byQuality: {} }
    // Gap is 5km/30min. One gap-sized candidate lands exactly on target; a second
    // would overshoot, so the solver should add exactly one.
    const candidates = [cand('a', 'run', 5, 30, ['endurance']), cand('b', 'run', 5, 30, ['endurance'])]
    const { placements } = solveWeek(target, { existingTotals, candidates, dayTags: {}, maxAdds: 7 })
    expect(placements.length).toBe(1)
  })

  it('never places on a rest day', () => {
    const target = { distanceKm: 100, durationMin: 600, distribution: null, qualities: [] }
    const candidates = Array.from({ length: 10 }, (_, i) => cand(`c${i}`, 'run', 10, 60, ['endurance']))
    const dayTags = { 1: 'rest', 2: 'rest', 3: 'rest', 4: 'rest', 5: 'rest', 6: 'rest', 7: 'rest' }
    const { placements } = solveWeek(target, { existingTotals: EMPTY_TOTALS, candidates, dayTags, maxAdds: 7 })
    expect(placements.length).toBe(0)               // all days rest → nothing placed
  })

  it('prefers high-intensity candidates on hard days, easy on easy days', () => {
    const target = { distanceKm: 20, durationMin: 120, distribution: null, qualities: ['vo2max'] }
    const hard = cand('hard', 'run', 10, 60, ['vo2max'])
    const easy = cand('easy', 'run', 10, 60, ['endurance'])
    const { placements } = solveWeek(target, {
      existingTotals: EMPTY_TOTALS, candidates: [hard, easy],
      dayTags: { 1: 'hard', 2: 'easy' }, maxAdds: 2,
    })
    const byDay = Object.fromEntries(placements.map(p => [p.weekday, p.session.id]))
    expect(byDay[1]).toBe('hard')
    expect(byDay[2]).toBe('easy')
  })

  it('serves the activity distribution among volume-reaching options', () => {
    const target = { distanceKm: 20, durationMin: 120, distribution: { run: 50, bike: 50 }, qualities: [] }
    const candidates = [
      cand('r1', 'run', 10, 60, ['endurance']),
      cand('b1', 'bike', 10, 60, ['endurance']),
      cand('r2', 'run', 10, 60, ['endurance']),
    ]
    const { placements } = solveWeek(target, { existingTotals: EMPTY_TOTALS, candidates, dayTags: {}, maxAdds: 2 })
    const tags = placements.map(p => p.session.activityTag).sort()
    expect(tags).toEqual(['bike', 'run'])           // one of each, not two runs
  })

  it('degrades gracefully with a thin bank (no crash, reports shortfall)', () => {
    const target = { distanceKm: 100, durationMin: 600, distribution: null, qualities: ['threshold'] }
    const candidates = [cand('only', 'run', 5, 30, ['endurance'])]
    const { placements, fit } = solveWeek(target, { existingTotals: EMPTY_TOTALS, candidates, dayTags: {}, maxAdds: 7 })
    expect(placements.length).toBeGreaterThan(0)
    expect(fit.distanceKm).toBeLessThan(100)        // shortfall reflected, no throw
  })
})
