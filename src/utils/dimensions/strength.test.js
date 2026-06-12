import { describe, it, expect } from 'vitest'
import { muscleScore, coverageFactor, strengthDose, musclesWorkedFromSession } from './strength'

describe('muscleScore saturation', () => {
  it('hits the user anchors 3->~50, 6->~80, 9->~90', () => {
    expect(muscleScore(3)).toBeGreaterThanOrEqual(50)
    expect(muscleScore(3)).toBeLessThan(56)
    expect(muscleScore(6)).toBeGreaterThanOrEqual(76)
    expect(muscleScore(6)).toBeLessThan(81)
    expect(muscleScore(9)).toBeGreaterThanOrEqual(88)
    expect(muscleScore(9)).toBeLessThan(91)
  })

  it('is monotonic increasing and bounded by 100', () => {
    expect(muscleScore(1)).toBeLessThan(muscleScore(2))
    expect(muscleScore(20)).toBeLessThan(100)
  })

  it('returns 0 for zero or negative sets', () => {
    expect(muscleScore(0)).toBe(0)
    expect(muscleScore(-3)).toBe(0)
  })
})

describe('coverageFactor', () => {
  it('saturates: ~4 muscles ~0.70, ~8 above 0.80', () => {
    expect(coverageFactor(4)).toBeCloseTo(0.7, 1)
    expect(coverageFactor(8)).toBeGreaterThan(0.8)
  })

  it('returns 0 for no muscles', () => {
    expect(coverageFactor(0)).toBe(0)
  })
})

describe('strengthDose', () => {
  it('rewards more muscles but with diminishing returns', () => {
    const oneBig = strengthDose({ quadriceps: 5 })
    const fourGroups = strengthDose({ quadriceps: 5, hamstrings: 4, calves: 3, abdominals: 3 })
    expect(fourGroups).toBeGreaterThan(oneBig)
    // Four groups should NOT be 4x one group — saturation must bend the curve.
    expect(fourGroups).toBeLessThan(oneBig * 2.5)
  })

  it('returns 0 for no muscles', () => {
    expect(strengthDose({})).toBe(0)
  })
})

describe('musclesWorkedFromSession', () => {
  const resolveMuscles = (id) =>
    ({ squat: ['quadriceps', 'glutes'], bench: ['chest', 'triceps'] }[id] || [])

  it('sums sets per muscle across exercise sections', () => {
    const workout = {
      activityTag: 'strength',
      blocks: {
        sections: [
          { kind: 'exercise', exerciseId: 'squat', sets: 5 },
          { kind: 'exercise', exerciseId: 'bench', sets: 4 },
        ],
      },
    }
    const m = musclesWorkedFromSession(workout, resolveMuscles)
    expect(m).toEqual({ quadriceps: 5, glutes: 5, chest: 4, triceps: 4 })
  })

  it('accumulates across multiple exercises hitting the same muscle', () => {
    const workout = {
      activityTag: 'strength',
      blocks: {
        sections: [
          { kind: 'exercise', exerciseId: 'squat', sets: 5 },
          { kind: 'exercise', exerciseId: 'squat', sets: 3 },
        ],
      },
    }
    const m = musclesWorkedFromSession(workout, resolveMuscles)
    expect(m.quadriceps).toBe(8)
  })

  it('returns empty for a non-strength / blockless session', () => {
    expect(musclesWorkedFromSession({ activityTag: 'run' }, resolveMuscles)).toEqual({})
  })

  it('returns empty when no resolver is provided', () => {
    const workout = { activityTag: 'strength', blocks: { sections: [{ kind: 'exercise', exerciseId: 'squat', sets: 5 }] } }
    expect(musclesWorkedFromSession(workout)).toEqual({})
  })
})
