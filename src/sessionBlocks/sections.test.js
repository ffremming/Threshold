import { describe, it, expect } from 'vitest'
import {
  normalizeSection,
  computeSectionWorkMinutes,
} from './sections'
import { computeSessionTotals, blocksToSummary } from './blocks'
import { estimatedSpeedKmh } from './units'

describe('optional pace on steady blocks', () => {
  it('estimates distance from duration when time mode has no pace', () => {
    const s = normalizeSection(
      { kind: 'warmup', paceMode: 'time', durationMin: 20 },
      'run'
    )
    expect(s.paceSecPerKm).toBe(0)
    // 20 min at estimatedSpeedKmh('run') (11 km/h) ≈ 3.67 km
    const expected = (20 / 60) * estimatedSpeedKmh('run')
    expect(s.distanceKm).toBeCloseTo(expected, 1)
    expect(s.distanceKm).toBeGreaterThan(0)
  })

  it('estimates duration from distance when length mode has no pace', () => {
    const s = normalizeSection(
      { kind: 'steady', paceMode: 'length', distanceKm: 3 },
      'run'
    )
    expect(s.paceSecPerKm).toBe(0)
    // 3 km at 11 km/h ≈ 16.4 min
    const expected = (3 / estimatedSpeedKmh('run')) * 60
    expect(s.durationMin).toBeCloseTo(expected, 1)
    expect(s.durationMin).toBeGreaterThan(0)
  })

  it('honors a manual distance estimate over the auto estimate in time mode', () => {
    const s = normalizeSection(
      { kind: 'warmup', paceMode: 'time', durationMin: 20, estimatedDistanceKm: 2.5 },
      'run'
    )
    expect(s.paceSecPerKm).toBe(0)
    expect(s.estimatedDistanceKm).toBe(2.5)
    expect(s.distanceKm).toBe(2.5)
  })

  it('uses the explicit pace when one is set', () => {
    const s = normalizeSection(
      { kind: 'steady', paceMode: 'length', distanceKm: 4, paceSecPerKm: 300 },
      'run'
    )
    // 4 km × 300 s/km = 1200 s = 20 min
    expect(s.durationMin).toBeCloseTo(20, 1)
  })

  it('omits pace from the summary when none is set', () => {
    const blocks = {
      sections: [
        normalizeSection({ kind: 'warmup', paceMode: 'time', durationMin: 20 }, 'run'),
      ],
    }
    const summary = blocksToSummary(blocks, 'run')
    expect(summary).toContain('20 min')
    expect(summary).not.toContain('@')
  })
})

describe('interval pace migration and optionality', () => {
  it("migrates legacy 'pace' mode to 'length' keeping the pace", () => {
    const s = normalizeSection(
      { kind: 'interval', paceMode: 'pace', reps: 5, dragKm: 1, paceSecPerKm: 240, pauseSec: 60 },
      'run'
    )
    expect(s.paceMode).toBe('length')
    expect(s.dragKm).toBe(1)
    expect(s.paceSecPerKm).toBe(240)
    // 5 × 1 km @ 240 s/km = 1200 s moving = 20 min, + 4 × 60 s rest = 4 min → 24 min
    expect(s.durationMin).toBeCloseTo(24, 1)
  })

  it('estimates length-mode interval distance/time without a pace', () => {
    const s = normalizeSection(
      { kind: 'interval', paceMode: 'length', reps: 4, dragKm: 1, paceSecPerKm: 0, pauseSec: 0 },
      'run'
    )
    expect(s.distanceKm).toBeCloseTo(4, 2)
    // work minutes estimate from estimatedSpeedKmh, > 0
    expect(computeSectionWorkMinutes(s, 'run')).toBeGreaterThan(0)
  })

  it('renders interval pace in the summary only when set', () => {
    const withPace = {
      sections: [normalizeSection(
        { kind: 'interval', paceMode: 'length', reps: 5, dragKm: 1, paceSecPerKm: 240, pauseSec: 0 },
        'run'
      )],
    }
    const noPace = {
      sections: [normalizeSection(
        { kind: 'interval', paceMode: 'length', reps: 5, dragKm: 1, paceSecPerKm: 0, pauseSec: 0 },
        'run'
      )],
    }
    expect(blocksToSummary(withPace, 'run')).toContain('@')
    expect(blocksToSummary(noPace, 'run')).not.toContain('@')
    expect(blocksToSummary(noPace, 'run')).toContain('5 × 1.0 km')
  })
})

describe('session totals stay meaningful without pace', () => {
  it('sums estimated distance and duration across pace-less blocks', () => {
    const blocks = {
      sections: [
        normalizeSection({ kind: 'warmup', paceMode: 'time', durationMin: 20 }, 'run'),
        normalizeSection({ kind: 'steady', paceMode: 'length', distanceKm: 5 }, 'run'),
      ],
    }
    const totals = computeSessionTotals(blocks, 'run')
    expect(totals.totalDistance).toBeGreaterThan(5)
    expect(totals.totalDuration).toBeGreaterThan(20)
  })
})
