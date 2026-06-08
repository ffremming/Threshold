import { describe, it, expect } from 'vitest'
import { classifyAcwr } from './loadSignals'

describe('classifyAcwr', () => {
  it('classifies the band boundaries on the lower-risk side', () => {
    expect(classifyAcwr(0.5)).toBe('undertraining')
    expect(classifyAcwr(0.8)).toBe('safe')   // inclusive lower edge
    expect(classifyAcwr(1.3)).toBe('safe')   // 1.3 is still safe
    expect(classifyAcwr(1.4)).toBe('caution')
    expect(classifyAcwr(1.5)).toBe('caution') // 1.5 is still caution
    expect(classifyAcwr(1.6)).toBe('spike')
  })

  it('returns null for a non-finite or zero ratio (no chronic history yet)', () => {
    expect(classifyAcwr(0)).toBeNull()
    expect(classifyAcwr(NaN)).toBeNull()
    expect(classifyAcwr(Infinity)).toBeNull()
  })
})
