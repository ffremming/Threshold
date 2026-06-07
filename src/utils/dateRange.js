import { getWeekNumber } from './week'

function parseISODate(iso) {
  const [y, m, d] = String(iso).split('-').map(Number)
  return new Date(y, m - 1, d)
}

// ISO week-numbering year: the Thursday of the date's week decides the year.
function isoWeekYear(date) {
  const thursday = new Date(date)
  thursday.setDate(thursday.getDate() + 4 - (thursday.getDay() || 7))
  return thursday.getFullYear()
}

// Returns ordered, de-duplicated { week, year } pairs (ISO week-numbering year)
// covering every day from startDate..endDate inclusive. Empty if start > end.
export function weeksInDateRange(startDate, endDate) {
  const start = parseISODate(startDate)
  const end = parseISODate(endDate)
  if (start > end) return []

  const seen = new Set()
  const result = []

  const add = date => {
    const week = getWeekNumber(date)
    const year = isoWeekYear(date)
    const key = `${year}:${week}`
    if (!seen.has(key)) {
      seen.add(key)
      result.push({ week, year })
    }
  }

  const cursor = new Date(start)
  while (cursor <= end) {
    add(cursor)
    cursor.setDate(cursor.getDate() + 7)
  }
  // The 7-day step can overshoot the final week; ensure it is included.
  add(end)

  return result
}
