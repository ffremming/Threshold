import { getWeekDates } from './week'

export const WEEKDAY_OPTIONS = [
  { value: 1, label: 'Monday', shortLabel: 'Mon' },
  { value: 2, label: 'Tuesday', shortLabel: 'Tue' },
  { value: 3, label: 'Wednesday', shortLabel: 'Wed' },
  { value: 4, label: 'Thursday', shortLabel: 'Thu' },
  { value: 5, label: 'Friday', shortLabel: 'Fri' },
  { value: 6, label: 'Saturday', shortLabel: 'Sat' },
  { value: 7, label: 'Sunday', shortLabel: 'Sun' },
]

export function normalizeWeekday(weekday) {
  const parsed = Number(weekday)
  if (Number.isInteger(parsed) && parsed >= 1 && parsed <= 7) return parsed
  return 1
}

export function formatDateForStorage(date) {
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0'),
  ].join('-')
}

export function getDateForWeekday(week, year, weekday) {
  const normalizedWeekday = normalizeWeekday(weekday)
  const { monday } = getWeekDates(week, year)
  const date = new Date(monday)
  date.setDate(monday.getDate() + normalizedWeekday - 1)
  return date
}

export function getDateStringForWeekday(week, year, weekday) {
  if (!week || !year) return ''
  return formatDateForStorage(getDateForWeekday(week, year, weekday))
}

export function getWeekdayMeta(weekday) {
  return WEEKDAY_OPTIONS.find(option => option.value === normalizeWeekday(weekday)) || WEEKDAY_OPTIONS[0]
}

export function getWeekdayFromDate(dateValue) {
  if (!dateValue) return null
  const [year, month, day] = String(dateValue).split('-').map(Number)
  if (!year || !month || !day) return null
  const jsWeekday = new Date(year, month - 1, day).getDay()
  return jsWeekday === 0 ? 7 : jsWeekday
}

export function chunkArray(items, size) {
  if (!Array.isArray(items) || items.length === 0) return []
  const chunkSize = Math.max(1, Number(size) || 1)
  const chunks = []
  for (let index = 0; index < items.length; index += chunkSize) {
    chunks.push(items.slice(index, index + chunkSize))
  }
  return chunks
}
