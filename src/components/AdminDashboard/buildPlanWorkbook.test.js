import { describe, it, expect } from 'vitest'
import * as XLSX from 'xlsx'
import {
  EXPORT_FIELDS,
  buildPlanWorkbook,
  planExportFilename,
} from './buildPlanWorkbook'

function sheetRows(wb) {
  const sheet = wb.Sheets[wb.SheetNames[0]]
  return XLSX.utils.sheet_to_json(sheet, { header: 1 })
}

const workout = {
  id: 'w1',
  date: '2026-06-03',
  weekday: 3,
  time: '08:00',
  title: 'Threshold 4x6',
  type: 'interval',
  activityTag: 'run',
  category: 'Hard',
  intensityZone: [4],
  loadTag: 'hard',
  distance: '10 km',
  warmup: 'easy jog',
  description: '4x6 min',
  sessionDetails: 'on track',
  exercises: '',
  rest: '2 min',
  cooldown: 'easy jog',
  notes: 'keep it controlled',
}

describe('EXPORT_FIELDS', () => {
  it('exposes a stable ordered list of field keys', () => {
    expect(EXPORT_FIELDS.map(f => f.key)).toEqual([
      'date', 'weekday', 'time', 'title', 'type', 'activityTag', 'category',
      'intensityZone', 'loadTag', 'distance', 'warmup', 'description',
      'sessionDetails', 'exercises', 'rest', 'cooldown', 'notes',
    ])
  })
})

describe('buildPlanWorkbook', () => {
  it('builds a header row from selected fields in canonical order', () => {
    const wb = buildPlanWorkbook({
      workouts: [workout],
      selectedFieldKeys: ['title', 'date'], // intentionally out of order
      includeAthleteColumn: false,
    })
    const rows = sheetRows(wb)
    expect(rows[0]).toEqual(['Date', 'Title'])
  })

  it('writes one row per workout with formatted values', () => {
    const wb = buildPlanWorkbook({
      workouts: [workout],
      selectedFieldKeys: ['date', 'weekday', 'intensityZone', 'title'],
      includeAthleteColumn: false,
    })
    const rows = sheetRows(wb)
    expect(rows.length).toBe(2)
    expect(rows[1][0]).toBe('03.06.2026') // date formatted
    expect(rows[1][1]).toBe('Wednesday')  // weekday label
    expect(typeof rows[1][2]).toBe('string') // intensity zone label
    expect(rows[1][3]).toBe('Threshold 4x6')
  })

  it('prepends an Athlete column only when includeAthleteColumn is true', () => {
    const wb = buildPlanWorkbook({
      workouts: [{ ...workout, athleteId: 'a1' }],
      selectedFieldKeys: ['title'],
      includeAthleteColumn: true,
      athleteNameById: { a1: 'Jane Doe' },
    })
    const rows = sheetRows(wb)
    expect(rows[0]).toEqual(['Athlete', 'Title'])
    expect(rows[1]).toEqual(['Jane Doe', 'Threshold 4x6'])
  })

  it('handles empty selectedFieldKeys by producing only a header (or athlete col)', () => {
    const wb = buildPlanWorkbook({
      workouts: [workout],
      selectedFieldKeys: [],
      includeAthleteColumn: false,
    })
    const rows = sheetRows(wb)
    expect(rows[0]).toEqual([])
  })
})

describe('planExportFilename', () => {
  it('slugs the athlete name and embeds the range', () => {
    expect(planExportFilename('Jane Doe', '2026-06-01', '2026-06-30'))
      .toBe('Training_plan_Jane_Doe_2026-06-01_2026-06-30.xlsx')
  })
  it('uses "all" for all-athletes export', () => {
    expect(planExportFilename(null, '2026-06-01', '2026-06-30'))
      .toBe('Training_plan_all_2026-06-01_2026-06-30.xlsx')
  })
})
