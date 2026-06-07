import * as XLSX from 'xlsx'
import {
  formatWorkoutDate,
  getIntensityZoneLabel,
  getWeekdayMeta,
} from '../../utils'

const text = key => w => (w[key] ?? '').toString()

// Single source of truth for export columns. Order here is the canonical
// column order; the modal's checkbox list and the builder both read it.
export const EXPORT_FIELDS = [
  { key: 'date',           header: 'Date',            width: 12, format: w => formatWorkoutDate(w.date) },
  { key: 'weekday',        header: 'Weekday',         width: 12, format: w => getWeekdayMeta(w.weekday).label },
  { key: 'time',           header: 'Time',            width: 8,  format: text('time') },
  { key: 'title',          header: 'Title',           width: 28, format: text('title') },
  { key: 'type',           header: 'Type',            width: 12, format: text('type') },
  { key: 'activityTag',    header: 'Activity',        width: 12, format: text('activityTag') },
  { key: 'category',       header: 'Category',        width: 10, format: text('category') },
  { key: 'intensityZone',  header: 'Intensity zone',  width: 16, format: w => getIntensityZoneLabel(w) },
  { key: 'loadTag',        header: 'Load',            width: 10, format: text('loadTag') },
  { key: 'distance',       header: 'Distance',        width: 12, format: text('distance') },
  { key: 'warmup',         header: 'Warmup',          width: 30, format: text('warmup') },
  { key: 'description',    header: 'Description',     width: 40, format: text('description') },
  { key: 'sessionDetails', header: 'Session details', width: 40, format: text('sessionDetails') },
  { key: 'exercises',      header: 'Exercises',       width: 30, format: text('exercises') },
  { key: 'rest',           header: 'Rest',            width: 12, format: text('rest') },
  { key: 'cooldown',       header: 'Cooldown',        width: 30, format: text('cooldown') },
  { key: 'notes',          header: 'Notes',           width: 30, format: text('notes') },
]

const ATHLETE_COL = { header: 'Athlete', width: 22 }

// Returns the EXPORT_FIELDS that are selected, preserving canonical order.
function selectedFields(selectedFieldKeys) {
  const set = new Set(selectedFieldKeys)
  return EXPORT_FIELDS.filter(f => set.has(f.key))
}

export function buildPlanWorkbook({
  workouts,
  selectedFieldKeys,
  includeAthleteColumn = false,
  athleteNameById = {},
}) {
  const fields = selectedFields(selectedFieldKeys)

  const headers = [
    ...(includeAthleteColumn ? [ATHLETE_COL.header] : []),
    ...fields.map(f => f.header),
  ]

  const rows = workouts.map(w => [
    ...(includeAthleteColumn ? [athleteNameById[w.athleteId] ?? w.athleteId ?? ''] : []),
    ...fields.map(f => f.format(w)),
  ])

  const sheet = XLSX.utils.aoa_to_sheet([headers, ...rows])
  sheet['!cols'] = [
    ...(includeAthleteColumn ? [{ wch: ATHLETE_COL.width }] : []),
    ...fields.map(f => ({ wch: f.width })),
  ]

  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, sheet, 'Training plan')
  return wb
}

function slug(name) {
  return String(name).trim().replace(/[^\w\-]+/g, '_').replace(/^_+|_+$/g, '')
}

export function planExportFilename(athleteName, startDate, endDate) {
  const who = athleteName ? slug(athleteName) : 'all'
  return `Training_plan_${who}_${startDate}_${endDate}.xlsx`
}

export function downloadPlanWorkbook(wb, filename) {
  XLSX.writeFile(wb, filename)
}
