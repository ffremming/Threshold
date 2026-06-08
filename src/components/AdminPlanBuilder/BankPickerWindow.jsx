import { useMemo, useState } from 'react'
import { Search, X } from 'lucide-react'
import { normalizeIntensityZones } from '../../utils'
import { DEFAULT_VISIBLE_ACTIVITIES } from './constants'
import BankActivityFilter from './BankActivityFilter'
import TemplateDragCard from './TemplateDragCard'

export default function BankPickerWindow({
  templates,
  onDragStart,
  onDragEnd,
  onAddTemplate,
  visibleActivities = DEFAULT_VISIBLE_ACTIVITIES,
  onAddActivity,
  onRemoveActivity,
}) {
  const [activeTagFilter, setActiveTagFilter] = useState(null)
  const [activeIntensityFilters, setActiveIntensityFilters] = useState([])
  const [search, setSearch] = useState('')

  const filteredTemplates = useMemo(() => {
    const query = search.trim().toLowerCase()
    return templates
      .filter(template => !template.activityTag || visibleActivities.includes(template.activityTag))
      .filter(template => !activeTagFilter || template.activityTag === activeTagFilter)
      .filter(template => {
        if (activeIntensityFilters.length === 0) return true
        const zones = normalizeIntensityZones(template.type, template.intensityZone)
        return activeIntensityFilters.some(zone => zones.includes(zone))
      })
      .filter(template => !query || (template.title || '').toLowerCase().includes(query))
      .sort((a, b) => a.title.localeCompare(b.title, 'nb'))
  }, [activeIntensityFilters, activeTagFilter, search, templates, visibleActivities])

  function toggleIntensityFilter(zone) {
    setActiveIntensityFilters(prev => (
      prev.includes(zone)
        ? prev.filter(currentZone => currentZone !== zone)
        : [...prev, zone].sort((a, b) => a - b)
    ))
  }

  return (
    <section className="pb-picker">
      <div className="pb-search">
        <Search className="pb-search-icon" aria-hidden="true" strokeWidth={2} />
        <input
          type="search"
          className="pb-search-input"
          placeholder="Search sessions…"
          value={search}
          onChange={event => setSearch(event.target.value)}
          aria-label="Search sessions by title"
        />
        {search && (
          <button
            type="button"
            className="pb-search-clear"
            onClick={() => setSearch('')}
            aria-label="Clear search"
          >
            <X className="pb-btn-icon" aria-hidden="true" strokeWidth={2} />
          </button>
        )}
      </div>

      <BankActivityFilter
        visibleActivities={visibleActivities}
        activeTagFilter={activeTagFilter}
        setActiveTagFilter={setActiveTagFilter}
        onAddActivity={onAddActivity}
        onRemoveActivity={onRemoveActivity}
      />

      <div className="pb-filter-row">
        <button
          type="button"
          className={`pb-filter-chip${activeIntensityFilters.length === 0 ? ' is-active' : ''}`}
          onClick={() => setActiveIntensityFilters([])}
        >All</button>
        {[1, 2, 3, 4, 5].map(zone => (
          <button
            key={zone}
            type="button"
            className={`pb-zone-chip pb-zone-${zone}${activeIntensityFilters.includes(zone) ? ' is-active' : ''}`}
            onClick={() => toggleIntensityFilter(zone)}
          >
            Z{zone}
          </button>
        ))}
      </div>

      <div className="pb-picker-count">
        {filteredTemplates.length} {filteredTemplates.length === 1 ? 'session' : 'sessions'}
      </div>

      {filteredTemplates.length === 0 ? (
        <div className="pb-empty-copy">No sessions match these filters.</div>
      ) : (
        <div className="pb-card-grid">
          {filteredTemplates.map(session => (
            <TemplateDragCard
              key={session.id}
              session={session}
              onDragStart={event => onDragStart(session, event)}
              onDragEnd={onDragEnd}
              onAdd={onAddTemplate}
            />
          ))}
        </div>
      )}
    </section>
  )
}
