import { describe, it, expect } from 'vitest'
import {
  QUALITIES,
  QUALITY_ORDER,
  QUALITY_COLORS,
  ZONE_WEIGHTS,
  REFERENCE_DOSE,
  TAU,
  STRENGTH_K,
  COVERAGE_K,
} from './constants'

describe('dimensions constants', () => {
  it('defines the six qualities including muscular endurance', () => {
    expect(QUALITIES).toEqual([
      'strength', 'endurance', 'muscular_endurance', 'vo2max', 'speed', 'threshold',
    ])
  })

  it('display order contains exactly the five qualities', () => {
    expect([...QUALITY_ORDER].sort()).toEqual([...QUALITIES].sort())
  })

  it('has a colour for every quality', () => {
    QUALITIES.forEach(q => expect(QUALITY_COLORS[q]).toMatch(/^#/))
  })

  it('has a positive reference dose and tau for every quality', () => {
    QUALITIES.forEach(q => {
      expect(REFERENCE_DOSE[q]).toBeGreaterThan(0)
      expect(TAU[q]).toBeGreaterThan(0)
    })
  })

  it('zone weight rows exist for zones 1-5', () => {
    for (let z = 1; z <= 5; z++) expect(ZONE_WEIGHTS[z]).toBeTruthy()
  })

  it('exposes the saturation constants', () => {
    expect(STRENGTH_K).toBeCloseTo(0.25)
    expect(COVERAGE_K).toBeCloseTo(1.714, 2)
  })
})
