import {
  Button,
  Toolbar,
  ToolbarGroup,
  SearchBox,
  Chip,
  SportPicker,
} from '../index'
import { TEMPLATE_CATEGORIES } from '../../../workoutTemplates'
import { WORKOUT_TYPES } from '../../../utils/intensity'
import { TRAINING_CATEGORIES, CATEGORY_LABELS, CATEGORY_COLORS } from '../../../utils/sessionCategory'
import { DURATION_PRESETS, durationPresetActive } from './durationPresets'
import './session-filter-bar.css'

const INTENSITY_ZONES = [1, 2, 3, 4, 5]

// Shared, composable filter UI. Renders only the rows in `enabled`, driven by a
// useSessionFilters() instance ({ criteria, set, filtersActive, clearAll }).
// Every session-listing surface uses this so filters look and behave identically.
export default function SessionFilterBar({
  criteria,
  set,
  filtersActive,
  clearAll,
  enabled,
  resultCount,
  sportCounts,
  presentSportValues,
  searchPlaceholder = 'Search sessions (title, description, sport)…',
  trailingAction,
  className,
}) {
  const has = key => enabled.includes(key)

  return (
    <Toolbar className={className}>
      {has('search') && (
        <SearchBox
          value={criteria.search}
          onChange={set.search}
          placeholder={searchPlaceholder}
        />
      )}

      {has('activities') && (
        <ToolbarGroup label="Sport">
          <SportPicker
            value={criteria.activities}
            onChange={set.activities}
            counts={sportCounts}
            limitToValues={presentSportValues}
          />
        </ToolbarGroup>
      )}

      {has('types') && (
        <ToolbarGroup label="Type">
          {WORKOUT_TYPES.map(t => (
            <Chip
              key={t.value}
              active={criteria.types.includes(t.value)}
              onClick={() => set.toggleType(t.value)}
            >{t.label}</Chip>
          ))}
        </ToolbarGroup>
      )}

      {has('categories') && (
        <ToolbarGroup label="Focus">
          {TRAINING_CATEGORIES.map(cat => (
            <button
              key={cat}
              type="button"
              className={`th-cat-chip${criteria.categories.includes(cat) ? ' is-active' : ''}`}
              style={{ '--cat-color': CATEGORY_COLORS[cat] }}
              aria-pressed={criteria.categories.includes(cat)}
              onClick={() => set.toggleCategory(cat)}
            >{CATEGORY_LABELS[cat]}</button>
          ))}
        </ToolbarGroup>
      )}

      {has('zones') && (
        <ToolbarGroup label="Zone">
          {INTENSITY_ZONES.map(zone => (
            <button
              key={zone}
              type="button"
              className={`th-zone-btn th-zone-${zone}${criteria.zones.includes(zone) ? ' is-active' : ''}`}
              aria-pressed={criteria.zones.includes(zone)}
              onClick={() => set.toggleZone(zone)}
            >Z{zone}</button>
          ))}
        </ToolbarGroup>
      )}

      {has('duration') && (
        <ToolbarGroup label="Duration">
          {DURATION_PRESETS.map(p => (
            <Chip
              key={p.label}
              active={durationPresetActive(criteria.duration, p)}
              onClick={() => set.duration(
                durationPresetActive(criteria.duration, p) ? null : { min: p.min, max: p.max },
              )}
            >{p.label}</Chip>
          ))}
        </ToolbarGroup>
      )}

      {has('templateCategory') && (
        <ToolbarGroup label="Category">
          <Chip active={criteria.templateCategory === 'All'} onClick={() => set.templateCategory('All')}>All</Chip>
          {TEMPLATE_CATEGORIES.filter(c => c !== 'All').map(c => (
            <Chip
              key={c}
              active={criteria.templateCategory === c}
              onClick={() => set.templateCategory(c)}
            >{c}</Chip>
          ))}
        </ToolbarGroup>
      )}

      {typeof resultCount === 'number' && (
        <span className="th-filter-count">
          {resultCount} {resultCount === 1 ? 'session' : 'sessions'}
        </span>
      )}

      {filtersActive && (
        <Button variant="ghost" size="sm" onClick={clearAll}>Clear filter</Button>
      )}

      {trailingAction && <div className="th-toolbar-action">{trailingAction}</div>}
    </Toolbar>
  )
}
