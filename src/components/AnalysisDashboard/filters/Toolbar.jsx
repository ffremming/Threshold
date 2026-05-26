import { Chip, SportPicker, Toolbar, ToolbarGroup } from '../../ui'
import { METRIC_OPTIONS, RANGE_OPTIONS } from '../constants'

export default function AnalysisToolbar({
  range, setRange, primaryMetric, setPrimaryMetric,
  activeTagFilter, setActiveTagFilter, presentSports,
}) {
  const sportFilter = activeTagFilter ? [activeTagFilter] : []

  return (
    <Toolbar>
      <ToolbarGroup label="Period">
        {RANGE_OPTIONS.map(option => (
          <Chip key={option.value} active={range === option.value} onClick={() => setRange(option.value)}>
            {option.label}
          </Chip>
        ))}
      </ToolbarGroup>
      <ToolbarGroup label="Metric">
        {METRIC_OPTIONS.map(option => (
          <Chip key={option.value} active={primaryMetric === option.value} onClick={() => setPrimaryMetric(option.value)}>
            {option.shortLabel}
          </Chip>
        ))}
      </ToolbarGroup>
      <ToolbarGroup label="Sport">
        <SportPicker
          value={sportFilter}
          onChange={(next) => setActiveTagFilter(next.length ? next[next.length - 1] : null)}
          limitToValues={presentSports}
        />
      </ToolbarGroup>
    </Toolbar>
  )
}
