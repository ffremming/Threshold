import { formatDurationLabel, formatKmValue } from '../../utils'

export function getWeekLabel(week) {
  return `Uke ${week.week}`
}

export function clampWindowStart(nextStart, totalWeeks, range) {
  const maxStart = Math.max(0, totalWeeks - range)
  return Math.min(Math.max(0, nextStart), maxStart)
}

export function safeDivide(a, b) {
  if (!Number.isFinite(a) || !Number.isFinite(b) || b === 0) return 0
  return a / b
}

export function average(values) {
  if (!values.length) return 0
  return values.reduce((sum, value) => sum + value, 0) / values.length
}

export function getStandardDeviation(values) {
  if (!values.length) return 0
  const mean = average(values)
  const variance = average(values.map(value => (value - mean) ** 2))
  return Math.sqrt(variance)
}

export function sumLastValues(values, count, endIndexInclusive) {
  const start = Math.max(0, endIndexInclusive - count + 1)
  return values.slice(start, endIndexInclusive + 1).reduce((sum, value) => sum + value, 0)
}

export function averageLastValues(values, count, endIndexInclusive) {
  const start = Math.max(0, endIndexInclusive - count + 1)
  const slice = values.slice(start, endIndexInclusive + 1)
  return average(slice)
}

export function formatMetricValue(metric, value) {
  if (!Number.isFinite(value) || value <= 0) {
    return metric === 'distance' ? '0 km' : metric === 'duration' ? '0m' : '0'
  }

  if (metric === 'distance') return formatKmValue(value)
  if (metric === 'duration') return formatDurationLabel(Math.round(value))
  if (metric === 'count') return `${Math.round(value)} økter`
  return `${Math.round(value)}`
}

export function formatDelta(value, suffix = '%') {
  if (!Number.isFinite(value)) return '0%'
  const rounded = Math.round(value)
  return `${rounded > 0 ? '+' : ''}${rounded}${suffix}`
}

export function formatScore(value) {
  if (!Number.isFinite(value) || value <= 0) return '0.0'
  return value.toFixed(1)
}

export function getWeekMetricValue(week, metric) {
  if (metric === 'distance') return week.distance
  if (metric === 'duration') return week.duration
  if (metric === 'count') return week.count
  return week.load
}

export function getMetricTooltip(metric) {
  if (metric === 'distance') return 'Kilometer per uke, aggregert pa tvers av alle relevante aktiviteter.'
  if (metric === 'duration') return 'Estimert total treningstid i analyseperioden.'
  if (metric === 'count') return 'Antall planlagte okter.'
  return 'Estimert treningsbelastning basert pa varighet og intensitet.'
}
