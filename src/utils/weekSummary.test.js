import { describe, it, expect } from 'vitest'
import { computeWeekSummary } from './weekSummary'

// distance is a string the estimators parse ("x km"); duration comes from notes text.
const run = {
  activityTag: 'run', type: 'rolig', intensityZone: [2],
  distance: '10 km', notes: '60 min',
}
const intervals = {
  activityTag: 'run', type: 'interval', intensityZone: [3, 4],
  distance: '8 km', notes: '40 min',
}
const strength = {
  activityTag: 'strength', type: 'styrke', intensityZone: [], notes: '45 min',
}

describe('computeWeekSummary', () => {
  it('returns zeroed structures for an empty week', () => {
    const s = computeWeekSummary([])
    expect(s.count).toBe(0)
    expect(s.totalDuration).toBe(0)
    expect(s.totalDistance).toBe(0)
    expect(s.activityDuration).toEqual({})
    expect(s.activityDistance).toEqual({})
    expect(s.zones).toEqual({ 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 })
  })

  it('sums totals and groups by activity tag', () => {
    const s = computeWeekSummary([run, intervals, strength])
    expect(s.count).toBe(3)
    expect(s.totalDuration).toBe(145)           // 60 + 40 + 45
    expect(s.totalDistance).toBe(18)            // 10 + 8 (strength has none)
    expect(s.activityDuration.run).toBe(100)    // 60 + 40
    expect(s.activityDuration.strength).toBe(45)
    expect(s.activityDistance.run).toBe(18)
    expect(s.activityDistance.strength).toBeUndefined() // no distance recorded
  })

  it('splits a workout duration evenly across its normalized zones', () => {
    // run: zone [2], 60 min -> all 60 to zone 2
    // intervals: zones [3,4], 40 min -> 20 to zone 3, 20 to zone 4
    const s = computeWeekSummary([run, intervals])
    expect(s.zones[2]).toBe(60)
    expect(s.zones[3]).toBe(20)
    expect(s.zones[4]).toBe(20)
    expect(s.zones[1]).toBe(0)
  })
})
