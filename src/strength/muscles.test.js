import { describe, it, expect } from 'vitest'
import {
  DATASET_MUSCLES,
  DATASET_TO_HIGHLIGHTER,
  HIGHLIGHTER_TO_DATASET,
  MUSCLE_GROUPS,
  toHighlighterMuscles,
  datasetMusclesForRegion,
  muscleLabel,
} from './muscles'

describe('muscle mapping', () => {
  it('maps every dataset muscle to at least one highlighter region', () => {
    for (const m of DATASET_MUSCLES) {
      expect(DATASET_TO_HIGHLIGHTER[m], `missing mapping for "${m}"`).toBeTruthy()
      expect(DATASET_TO_HIGHLIGHTER[m].length).toBeGreaterThan(0)
    }
  })

  it('expands shoulders into both front and back deltoids', () => {
    expect(toHighlighterMuscles(['shoulders']).sort()).toEqual(
      ['back-deltoids', 'front-deltoids'],
    )
  })

  it('deduplicates regions when two muscles map to the same one', () => {
    // lats and middle back both map to upper-back
    expect(toHighlighterMuscles(['lats', 'middle back'])).toEqual(['upper-back'])
  })

  it('ignores unknown muscle names', () => {
    expect(toHighlighterMuscles(['not-a-muscle'])).toEqual([])
  })

  it('provides a friendly label, falling back to the raw name', () => {
    expect(muscleLabel('quadriceps')).toBe('Quads')
    expect(muscleLabel('mystery')).toBe('mystery')
  })

  it('reverse-maps a region back to its dataset muscles', () => {
    // upper-back is shared by lats and middle back
    expect(datasetMusclesForRegion('upper-back').sort()).toEqual(['lats', 'middle back'])
    expect(datasetMusclesForRegion('quadriceps')).toEqual(['quadriceps'])
    expect(datasetMusclesForRegion('not-a-region')).toEqual([])
  })

  it('round-trips: every region in the reverse map maps back forward', () => {
    for (const [region, datasetMuscles] of Object.entries(HIGHLIGHTER_TO_DATASET)) {
      for (const m of datasetMuscles) {
        expect(DATASET_TO_HIGHLIGHTER[m]).toContain(region)
      }
    }
  })

  it('muscle groups reference only real dataset muscles', () => {
    for (const g of MUSCLE_GROUPS) {
      expect(g.muscles.length).toBeGreaterThan(0)
      for (const m of g.muscles) {
        expect(DATASET_MUSCLES, `${g.key} references unknown muscle "${m}"`).toContain(m)
      }
    }
  })
})
