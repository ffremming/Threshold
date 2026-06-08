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

  it('derives duration and distance from the sum of a session\'s block parts', () => {
    // A run with two distance-first sections: 2 km warmup + 6 km steady = 8 km.
    // Durations come from computeSectionDuration (distance * pace / 60).
    const blockRun = {
      activityTag: 'run', type: 'rolig', intensityZone: [2],
      // these legacy fields must be IGNORED in favour of the blocks:
      distance: '999 km', notes: '999 min',
      blocks: {
        sections: [
          { kind: 'warmup', paceMode: 'length', distanceKm: 2, paceSecPerKm: 360 },
          { kind: 'steady', paceMode: 'length', distanceKm: 6, paceSecPerKm: 330 },
        ],
      },
    }
    const s = computeWeekSummary([blockRun])
    expect(s.totalDistance).toBe(8)                       // 2 + 6, from blocks
    expect(s.activityDistance.run).toBe(8)
    // 2km*360s/60 + 6km*330s/60 = 12 + 33 = 45 min
    expect(s.totalDuration).toBe(45)
    expect(s.activityDuration.run).toBe(45)
  })

  it('aggregates zone minutes per block: warmup/cooldown=Z1, interval reps (no pauses)=peak zone', () => {
    // Session tagged peak zone 4, with: 10-min warmup, intervals (5 reps ×
    // 240s work + 120s pause), 5-min cooldown.
    // Interval WORK = 5 × 240s = 1200s = 20 min (pauses excluded).
    const session = {
      activityTag: 'run', type: 'interval', intensityZone: [4],
      blocks: {
        sections: [
          { kind: 'warmup', paceMode: 'time', durationMin: 10, paceSecPerKm: 360 },
          { kind: 'interval', paceMode: 'time', reps: 5, dragSec: 240, pauseSec: 120, paceSecPerKm: 240 },
          { kind: 'cooldown', paceMode: 'time', durationMin: 5, paceSecPerKm: 360 },
        ],
      },
    }
    const s = computeWeekSummary([session])
    expect(s.zones[1]).toBe(15)   // 10 warmup + 5 cooldown
    expect(s.zones[4]).toBe(20)   // interval reps only (pauses excluded)
    expect(s.zones[2]).toBe(0)
    expect(s.zones[3]).toBe(0)
    expect(s.zones[5]).toBe(0)
  })

  it('splits work-block minutes evenly across multiple tagged zones', () => {
    // Tagged zones [3,4]; a single 40-min interval work block (no warmup/cooldown).
    // Interval WORK = 5 × 240s = 20 min → split half to Z3, half to Z4.
    const twoZone = {
      activityTag: 'run', type: 'interval', intensityZone: [3, 4],
      blocks: {
        sections: [
          { kind: 'interval', paceMode: 'time', reps: 5, dragSec: 240, pauseSec: 120, paceSecPerKm: 240 },
        ],
      },
    }
    const s = computeWeekSummary([twoZone])
    expect(s.zones[3]).toBe(10)   // 20 / 2
    expect(s.zones[4]).toBe(10)   // 20 / 2
    expect(s.zones[1]).toBe(0)

    // Three zones → a third each. 30-min steady block tagged [2,3,4] = 10 each.
    const threeZone = {
      activityTag: 'run', type: 'rolig', intensityZone: [2, 3, 4],
      blocks: { sections: [{ kind: 'steady', paceMode: 'time', durationMin: 30, paceSecPerKm: 330 }] },
    }
    const t = computeWeekSummary([threeZone])
    expect(t.zones[2]).toBe(10)
    expect(t.zones[3]).toBe(10)
    expect(t.zones[4]).toBe(10)
  })

  it('contributes no zone minutes for a session with no tagged zone (no invented defaults)', () => {
    const untagged = {
      activityTag: 'run', type: 'rolig', intensityZone: [],
      blocks: { sections: [{ kind: 'steady', paceMode: 'time', durationMin: 40, paceSecPerKm: 330 }] },
    }
    const s = computeWeekSummary([untagged])
    expect(s.zones).toEqual({ 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 })
    // but it still counts toward total time
    expect(s.totalDuration).toBe(40)
  })
})
