import { describe, it, expect } from 'vitest'
import {
  aggregateMuscleLoad,
  buildHighlighterData,
  exerciseHighlighterData,
  INTENSITY_TIERS,
} from './selectors'
import { getExercise } from './library'

// Barbell Squat: primary [quadriceps], secondary [calves, glutes, hamstrings, lower back]
const SQUAT = 'Barbell_Squat'

describe('aggregateMuscleLoad', () => {
  it('weights primary muscles by full sets and secondary by half', () => {
    const load = aggregateMuscleLoad([
      { kind: 'exercise', exerciseId: SQUAT, sets: 4 },
    ])
    expect(load.quadriceps).toBe(4)      // primary
    expect(load.calves).toBe(2)          // secondary = 4 * 0.5
    expect(load['lower back']).toBe(2)
  })

  it('accumulates volume across multiple exercise sections', () => {
    const load = aggregateMuscleLoad([
      { kind: 'exercise', exerciseId: SQUAT, sets: 3 },
      { kind: 'exercise', exerciseId: SQUAT, sets: 1 },
    ])
    expect(load.quadriceps).toBe(4)
  })

  it('ignores non-exercise sections, missing ids, and zero sets', () => {
    const load = aggregateMuscleLoad([
      { kind: 'warmup', durationMin: 10 },
      { kind: 'exercise', sets: 5 },                       // no exerciseId
      { kind: 'exercise', exerciseId: 'nope', sets: 5 },   // unknown id
      { kind: 'exercise', exerciseId: SQUAT, sets: 0 },    // zero sets
    ])
    expect(Object.keys(load)).toHaveLength(0)
  })
})

describe('buildHighlighterData', () => {
  it('returns highlighter entries with integer frequency tiers within range', () => {
    const data = buildHighlighterData([
      { kind: 'exercise', exerciseId: SQUAT, sets: 4 },
    ])
    expect(data.length).toBeGreaterThan(0)
    for (const entry of data) {
      expect(entry.muscles).toEqual([entry.name])
      expect(Number.isInteger(entry.frequency)).toBe(true)
      expect(entry.frequency).toBeGreaterThanOrEqual(1)
      expect(entry.frequency).toBeLessThanOrEqual(INTENSITY_TIERS)
    }
  })

  it('gives the highest-volume muscle the top tier', () => {
    const data = buildHighlighterData([
      { kind: 'exercise', exerciseId: SQUAT, sets: 4 },
    ])
    // quadriceps (primary, full weight) is busiest -> maps to "quadriceps" region
    const quads = data.find(d => d.name === 'quadriceps')
    expect(quads?.frequency).toBe(INTENSITY_TIERS)
  })

  it('returns an empty array when there is no load', () => {
    expect(buildHighlighterData([{ kind: 'warmup' }])).toEqual([])
  })
})

describe('exerciseHighlighterData', () => {
  it('marks primary muscles at the top tier and secondary lower', () => {
    const data = exerciseHighlighterData(getExercise(SQUAT))
    const quads = data.find(d => d.name === 'quadriceps')
    const calves = data.find(d => d.name === 'calves')
    expect(quads.frequency).toBe(INTENSITY_TIERS)
    expect(calves.frequency).toBeLessThan(INTENSITY_TIERS)
  })

  it('returns empty for a null exercise', () => {
    expect(exerciseHighlighterData(null)).toEqual([])
  })
})
