import { useEffect, useMemo, useState } from 'react'
import { X } from 'lucide-react'
import { isHardWorkout, normalizeIntensityZones } from '../../utils'
import { DEFAULT_VISIBLE_ACTIVITIES } from './constants'
import BankActivityFilter from './BankActivityFilter'
import SessionColumn from './SessionColumn'

export default function BankPickerWindow({
  windowNumber,
  isPrimary = false,
  templates,
  onDragStart,
  onDragEnd,
  onAddTemplate,
  canRemove,
  onRemove,
  onEditTemplate,
  onDeleteTemplate,
  visibleActivities = DEFAULT_VISIBLE_ACTIVITIES,
  onAddActivity,
  onRemoveActivity,
}) {
  const [activeTagFilter, setActiveTagFilter] = useState(null)
  const [activeIntensityFilters, setActiveIntensityFilters] = useState([])

  useEffect(() => {
    if (activeTagFilter && !visibleActivities.includes(activeTagFilter)) {
      setActiveTagFilter(null)
    }
  }, [activeTagFilter, visibleActivities])

  const filteredTemplates = useMemo(() => (
    templates
      .filter(template => !template.activityTag || visibleActivities.includes(template.activityTag))
      .filter(template => !activeTagFilter || template.activityTag === activeTagFilter)
      .filter(template => {
        if (activeIntensityFilters.length === 0) return true
        const zones = normalizeIntensityZones(template.type, template.intensityZone)
        return activeIntensityFilters.some(zone => zones.includes(zone))
      })
      .sort((a, b) => a.title.localeCompare(b.title, 'nb'))
  ), [activeIntensityFilters, activeTagFilter, templates, visibleActivities])

  const hardTemplates = useMemo(() => (
    filteredTemplates.filter(template => isHardWorkout(template))
  ), [filteredTemplates])

  const easyTemplates = useMemo(() => (
    filteredTemplates.filter(template => !isHardWorkout(template))
  ), [filteredTemplates])

  function toggleIntensityFilter(zone) {
    setActiveIntensityFilters(prev => (
      prev.includes(zone)
        ? prev.filter(currentZone => currentZone !== zone)
        : [...prev, zone].sort((a, b) => a - b)
    ))
  }

  return (
    <section className="pb-picker">
      {!isPrimary && (
        <header className="pb-picker-head">
          <div>
            <h3 className="pb-column-title">Vindu {windowNumber}</h3>
            <span className="pb-column-count">{filteredTemplates.length} økter</span>
          </div>
          {canRemove ? (
            <button type="button" className="pb-mini-btn pb-mini-btn--icon" onClick={onRemove} aria-label="Lukk vindu">
              <X className="pb-btn-icon" aria-hidden="true" strokeWidth={2} />
            </button>
          ) : null}
        </header>
      )}

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
        >Alle</button>
        {[1, 2, 3, 4, 5].map(zone => (
          <button
            key={zone}
            type="button"
            className={`pb-zone-chip pb-zone-${zone}${activeIntensityFilters.includes(zone) ? ' is-active' : ''}`}
            onClick={() => toggleIntensityFilter(zone)}
          >
            S{zone}
          </button>
        ))}
      </div>

      <div className="pb-picker-grid">
        <SessionColumn
          title="Hardøkter"
          subtitle={`${hardTemplates.length} økter`}
          sessions={hardTemplates}
          onDragStart={onDragStart}
          onDragEnd={onDragEnd}
          onAddTemplate={onAddTemplate}
          onEditTemplate={onEditTemplate}
          onDeleteTemplate={onDeleteTemplate}
        />
        <SessionColumn
          title="Rolige økter"
          subtitle={`${easyTemplates.length} økter`}
          sessions={easyTemplates}
          onDragStart={onDragStart}
          onDragEnd={onDragEnd}
          onAddTemplate={onAddTemplate}
          onEditTemplate={onEditTemplate}
          onDeleteTemplate={onDeleteTemplate}
        />
      </div>
    </section>
  )
}
