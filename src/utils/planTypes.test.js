import { describe, it, expect } from 'vitest'
import {
  BAND_TYPES, BAND_TYPE_MAP, CUSTOM_BAND_TYPE,
  resolveBandColor, resolveBandLabel,
  GOAL_PRIORITIES, goalPriorityWeight,
  defaultNoteColor, NOTE_AUTHOR_COLORS,
} from './planTypes'

describe('band type palette', () => {
  it('every preset has a value, label, and hex color', () => {
    for (const t of BAND_TYPES) {
      expect(t.value).toBeTruthy()
      expect(t.label).toBeTruthy()
      expect(t.color).toMatch(/^#[0-9a-f]{6}$/i)
    }
  })
  it('includes the phases and focus areas from the spec', () => {
    const values = BAND_TYPES.map(t => t.value)
    for (const v of ['recovery', 'raceDay', 'buildup', 'taper',
      'volume', 'vo2max', 'threshold', 'raceSpecificity', 'testing', 'peak']) {
      expect(values).toContain(v)
    }
  })
  it('map is keyed by value', () => {
    expect(BAND_TYPE_MAP.taper.label).toBe('Taper')
  })
})

describe('resolveBandColor / resolveBandLabel', () => {
  it('uses the preset color/label for a known type', () => {
    expect(resolveBandColor({ type: 'taper' })).toBe(BAND_TYPE_MAP.taper.color)
    expect(resolveBandLabel({ type: 'taper' })).toBe('Taper')
  })
  it('uses the stored color/label for a custom band', () => {
    const band = { type: CUSTOM_BAND_TYPE, color: '#123456', label: 'My phase' }
    expect(resolveBandColor(band)).toBe('#123456')
    expect(resolveBandLabel(band)).toBe('My phase')
  })
  it('falls back gracefully for an unknown type', () => {
    expect(resolveBandColor({ type: 'mystery', color: '#abcdef' })).toBe('#abcdef')
    expect(resolveBandLabel({ type: 'mystery', label: 'X' })).toBe('X')
  })
})

describe('goal priorities', () => {
  it('orders A, B, C with ascending weight', () => {
    expect(GOAL_PRIORITIES.map(p => p.value)).toEqual(['A', 'B', 'C'])
    expect(goalPriorityWeight('A')).toBe(1)
    expect(goalPriorityWeight('C')).toBe(3)
  })
  it('defaults unknown priority to the lowest weight', () => {
    expect(goalPriorityWeight('Z')).toBe(3)
  })
})

describe('note author colors', () => {
  it('gives coach and athlete distinct defaults', () => {
    expect(defaultNoteColor('coach')).toBe(NOTE_AUTHOR_COLORS.coach)
    expect(defaultNoteColor('athlete')).toBe(NOTE_AUTHOR_COLORS.athlete)
    expect(defaultNoteColor('coach')).not.toBe(defaultNoteColor('athlete'))
  })
})
