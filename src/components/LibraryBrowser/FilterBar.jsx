import { TEMPLATE_CATEGORIES } from '../../workoutTemplates'
import {
  Button,
  Toolbar,
  ToolbarGroup,
  SearchBox,
  Chip,
  SportPicker,
} from '../ui'

const INTENSITY_ZONES = [1, 2, 3, 4, 5]

export default function FilterBar({
  search, onSearch,
  activitySet, onActivityChange, sportCounts, presentSportValues,
  category, onCategoryChange,
  zoneSet, onToggleZone,
  filtersActive, onClear,
  trailingAction,
}) {
  return (
    <Toolbar>
      <SearchBox value={search} onChange={onSearch} placeholder="Search sessions (title, description, sport)…" />

      <ToolbarGroup label="Sport">
        <SportPicker
          value={activitySet}
          onChange={onActivityChange}
          counts={sportCounts}
          limitToValues={presentSportValues}
        />
      </ToolbarGroup>

      <ToolbarGroup label="Category">
        <Chip active={category === 'All'} onClick={() => onCategoryChange('All')}>All</Chip>
        {TEMPLATE_CATEGORIES.filter(cat => cat !== 'All').map(cat => (
          <Chip key={cat} active={category === cat} onClick={() => onCategoryChange(cat)}>{cat}</Chip>
        ))}
      </ToolbarGroup>

      <ToolbarGroup label="Zone">
        {INTENSITY_ZONES.map(zone => (
          <button
            key={zone}
            type="button"
            className={`th-zone-btn th-zone-${zone}${zoneSet.has(zone) ? ' is-active' : ''}`}
            onClick={() => onToggleZone(zone)}
          >Z{zone}</button>
        ))}
      </ToolbarGroup>

      {filtersActive && (
        <Button variant="ghost" size="sm" onClick={onClear}>Clear filter</Button>
      )}

      {trailingAction && <div className="th-toolbar-action">{trailingAction}</div>}
    </Toolbar>
  )
}
