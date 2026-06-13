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

describe('solveWeek — quality weights + hard cap', () => {
  const EMPTY = { distance: 0, durationMin: 0, byActivity: {}, byQuality: {} }

  it('favors the higher-weighted quality in the session mix', () => {
    // Weights strongly favor vo2max over endurance. With 2 slots and a generous
    // volume target, the mix should lean toward the vo2max session.
    const target = {
      distanceKm: 40, durationMin: 240, distribution: null, qualities: [],
      qualityWeights: { vo2max: 0.9, endurance: 0.1 },
    }
    const candidates = [
      cand('vo2', 'run', 10, 60, ['vo2max']),
      cand('end', 'run', 10, 60, ['endurance']),
    ]
    const { placements } = solveWeek(target, { existingTotals: EMPTY, candidates, dayTags: {}, maxAdds: 2 })
    const vo2Count = placements.filter(p => p.session.id === 'vo2').length
    const endCount = placements.filter(p => p.session.id === 'end').length
    expect(vo2Count).toBeGreaterThanOrEqual(endCount)
    expect(vo2Count).toBeGreaterThan(0)
  })

  const isHard = p => (p.session.qualities || []).some(q => ['threshold', 'vo2max', 'speed', 'strength'].includes(q))

  it('placed sessions carry their qualities (so intensity is visible)', () => {
    const target = { distanceKm: 20, durationMin: 120, distribution: null, qualities: [], qualityWeights: { vo2max: 1 } }
    const candidates = [cand('vo2', 'run', 10, 60, ['vo2max'])]
    const { placements } = solveWeek(target, { existingTotals: EMPTY, candidates, dayTags: {}, maxAdds: 2 })
    expect(placements[0].session.qualities).toContain('vo2max')
  })

  it('caps HARD sessions per week and fills the rest easy', () => {
    // Many candidates, big volume target, but hardPerWeek=2 limits the hard ones;
    // the remaining slots must be filled with easy/endurance sessions.
    const target = {
      distanceKm: 100, durationMin: 600, distribution: null, qualities: [],
      qualityWeights: { vo2max: 1 }, hardPerWeek: 2,
    }
    const candidates = [
      ...Array.from({ length: 5 }, (_, i) => cand(`h${i}`, 'run', 10, 60, ['vo2max'])),
      ...Array.from({ length: 5 }, (_, i) => cand(`e${i}`, 'run', 10, 60, ['endurance'])),
    ]
    const { placements } = solveWeek(target, { existingTotals: EMPTY, candidates, dayTags: {}, maxAdds: 7 })
    expect(placements.filter(isHard).length).toBe(2)        // exactly the cap
    expect(placements.filter(p => !isHard(p)).length).toBeGreaterThan(0) // rest are easy
  })

  it('counts existing hard sessions toward the hard cap', () => {
    const existing = {
      distance: 10, durationMin: 60,
      byActivity: { run: { distance: 10, duration: 60 } },
      byQuality: {}, hardCount: 2, // already 2 hard sessions on the calendar
    }
    const target = {
      distanceKm: 100, durationMin: 600, distribution: null, qualities: [],
      qualityWeights: { vo2max: 1 }, hardPerWeek: 2,
    }
    const candidates = [
      ...Array.from({ length: 5 }, (_, i) => cand(`h${i}`, 'run', 10, 60, ['vo2max'])),
      ...Array.from({ length: 5 }, (_, i) => cand(`e${i}`, 'run', 10, 60, ['endurance'])),
    ]
    const { placements } = solveWeek(target, { existingTotals: existing, candidates, dayTags: {}, maxAdds: 7 })
    expect(placements.filter(isHard).length).toBe(0) // cap already met by existing
  })

  it('only allows hard sessions for activities in hardActivities', () => {
    // Hard enabled for run, disabled for bike. Big volume so both sports fill up,
    // but only run may carry hard sessions; bike must stay easy.
    const target = {
      distanceKm: 0, durationMin: 600, distribution: { run: 50, bike: 50 }, qualities: [],
      qualityWeights: { vo2max: 1 }, hardActivities: ['run'],
    }
    const candidates = [
      cand('run-hard', 'run', 0, 60, ['vo2max']),
      cand('run-easy', 'run', 0, 60, ['endurance']),
      cand('bike-hard', 'bike', 0, 60, ['vo2max']),
      cand('bike-easy', 'bike', 0, 60, ['endurance']),
    ]
    const { placements } = solveWeek(target, { existingTotals: EMPTY, candidates, dayTags: {}, maxAdds: 7 })
    const bikeHard = placements.filter(p => p.session.activityTag === 'bike' && isHard(p))
    expect(bikeHard.length).toBe(0)                 // bike never hard
    const runHard = placements.filter(p => p.session.activityTag === 'run' && isHard(p))
    expect(runHard.length).toBeGreaterThan(0)       // run gets the hard work
  })

  it('with hardActivities empty, no session is hard', () => {
    const target = {
      distanceKm: 0, durationMin: 300, distribution: null, qualities: [],
      qualityWeights: { vo2max: 1 }, hardActivities: [],
    }
    const candidates = [
      cand('hard', 'run', 0, 60, ['vo2max']),
      cand('easy', 'run', 0, 60, ['endurance']),
    ]
    const { placements } = solveWeek(target, { existingTotals: EMPTY, candidates, dayTags: {}, maxAdds: 5 })
    expect(placements.filter(isHard).length).toBe(0)
    expect(placements.length).toBeGreaterThan(0)    // still fills volume with easy
  })
})
