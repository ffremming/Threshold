// Small pure series-math helpers shared across features (load signals, the
// analysis dashboard). These live in src/utils so shared low-level code never
// has to import upward from src/components. The same helpers are also defined
// locally in a couple of component util files; those predate this module and
// are left untouched to keep this change scoped.

export function average(values) {
  if (!values.length) return 0
  return values.reduce((sum, value) => sum + value, 0) / values.length
}

export function averageLastValues(values, count, endIndexInclusive) {
  const start = Math.max(0, endIndexInclusive - count + 1)
  const slice = values.slice(start, endIndexInclusive + 1)
  return average(slice)
}

export function sumLastValues(values, count, endIndexInclusive) {
  const start = Math.max(0, endIndexInclusive - count + 1)
  return values.slice(start, endIndexInclusive + 1).reduce((sum, value) => sum + value, 0)
}

export function getStandardDeviation(values) {
  if (!values.length) return 0
  const mean = average(values)
  const variance = average(values.map(value => (value - mean) ** 2))
  return Math.sqrt(variance)
}

export function safeDivide(a, b) {
  if (!Number.isFinite(a) || !Number.isFinite(b) || b === 0) return 0
  return a / b
}
