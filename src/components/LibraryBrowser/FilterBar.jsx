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
      <SearchBox value={search} onChange={onSearch} placeholder="Søk økter (tittel, beskrivelse, sport)…" />

      <ToolbarGroup label="Sport">
        <SportPicker
          value={activitySet}
          onChange={onActivityChange}
          counts={sportCounts}
          limitToValues={presentSportValues}
        />
      </ToolbarGroup>

      <ToolbarGroup label="Kategori">
        <Chip active={category === 'Alle'} onClick={() => onCategoryChange('Alle')}>Alle</Chip>
        {TEMPLATE_CATEGORIES.filter(cat => cat !== 'Alle').map(cat => (
          <Chip key={cat} active={category === cat} onClick={() => onCategoryChange(cat)}>{cat}</Chip>
        ))}
      </ToolbarGroup>

      <ToolbarGroup label="Sone">
        {INTENSITY_ZONES.map(zone => (
          <button
            key={zone}
            type="button"
            className={`tp-zone-btn tp-zone-${zone}${zoneSet.has(zone) ? ' is-active' : ''}`}
            onClick={() => onToggleZone(zone)}
          >S{zone}</button>
        ))}
      </ToolbarGroup>

      {filtersActive && (
        <Button variant="ghost" size="sm" onClick={onClear}>Tøm filter</Button>
      )}

      {trailingAction && <div className="tp-toolbar-action">{trailingAction}</div>}
    </Toolbar>
  )
}
