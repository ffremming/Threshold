// Session-scoped store for the month-view trend chart's chosen metric.
//
// The metric lives here, at module scope, rather than in MonthTrendPanel's
// local state because navigating weeks in the month view unmounts and remounts
// the panel — local state would snap back to the default on every week change.
// Module scope persists for the lifetime of the builder session (until a full
// page reload), so the choice survives those remounts.
//
// resetTrendMetric() exists for tests, which need a clean default between cases
// precisely because this state outlives any single component instance.

let metric = 'distance'

export function getTrendMetric() {
  return metric
}

export function setTrendMetric(next) {
  metric = next
}

export function resetTrendMetric() {
  metric = 'distance'
}
