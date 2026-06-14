import { useMemo, useState } from 'react'
import { SessionFilterBar } from '../../components/ui'
import { useSessionFilters } from '../../App/hooks/useSessionFilters'
import { makeMuscleResolver } from '../dimensions/useMuscleResolver'
import { DEFAULT_VISIBLE_ACTIVITIES } from './constants'
import BankActivityFilter from './BankActivityFilter'
import TemplateDragCard from './TemplateDragCard'

// Shared so training-category scoring (which needs the muscle library for
// strength sessions) matches every other load/dimensions surface in the app.
const resolveMuscles = makeMuscleResolver()

// Filters offered by the plan-builder session picker. Activity is handled by the
// icon-based BankActivityFilter (a faster, pinned-tag selector for this surface),
// so it is intentionally NOT in this list — everything else comes from the shared
// filter bar so the picker gains zones/types/focus/duration/full-text search.
const PICKER_FILTERS = ['search', 'zones', 'types', 'categories', 'duration']

// Source scopes, mirroring BibliotekTab: the coach's own bank, the shared global
// library, and the selected athlete's personal sessions. Sessions from any scope
// drag/add identically — the wiring just takes a plain session object.
const SCOPES = [
  { value: 'mine', label: 'My bank' },
  { value: 'global', label: 'Library' },
  { value: 'athlete', label: 'Athlete' },
]

export default function BankPickerWindow({
  templates,
  loadingTemplates = false,
  globalTemplates = [],
  loadingGlobalTemplates = false,
  athleteSessions = [],
  loadingAthleteSessions = false,
  hasAthlete = false,
  onDragStart,
  onDragEnd,
  onAddTemplate,
  visibleActivities = DEFAULT_VISIBLE_ACTIVITIES,
  onAddActivity,
  onRemoveActivity,
}) {
  const [scope, setScope] = useState('mine')
  const [activeTagFilter, setActiveTagFilter] = useState(null)

  const visibleScopes = useMemo(
    () => SCOPES.filter(s => s.value !== 'athlete' || hasAthlete),
    [hasAthlete],
  )

  const scopeSource = scope === 'global'
    ? globalTemplates
    : scope === 'athlete'
      ? athleteSessions
      : templates
  const scopeLoading = scope === 'global'
    ? loadingGlobalTemplates
    : scope === 'athlete'
      ? loadingAthleteSessions
      : loadingTemplates

  // Different scopes have different activities present, so a tag selected in one
  // scope rarely makes sense in another — reset it when switching.
  function changeScope(next) {
    setScope(next)
    setActiveTagFilter(null)
  }

  // Activity is filtered up-front (visibility show/hide + the single active tag),
  // then the shared engine applies search/zone/type/focus/duration.
  const byActivity = useMemo(() => (
    scopeSource
      .filter(t => !t.activityTag || visibleActivities.includes(t.activityTag))
      .filter(t => !activeTagFilter || t.activityTag === activeTagFilter)
  ), [scopeSource, visibleActivities, activeTagFilter])

  const filters = useSessionFilters(byActivity, {
    enabled: PICKER_FILTERS,
    resolveMuscles,
  })

  const filteredTemplates = useMemo(
    () => [...filters.filtered].sort((a, b) => (a.title || '').localeCompare(b.title || '', 'nb')),
    [filters.filtered],
  )

  return (
    <section className="pb-picker">
      <div className="pb-picker-scope" role="tablist" aria-label="Session source">
        {visibleScopes.map(s => (
          <button
            key={s.value}
            type="button"
            role="tab"
            aria-selected={scope === s.value}
            className={`pb-picker-scope-btn${scope === s.value ? ' is-active' : ''}`}
            onClick={() => changeScope(s.value)}
          >
            {s.label}
          </button>
        ))}
      </div>

      <SessionFilterBar
        criteria={filters.criteria}
        set={filters.set}
        filtersActive={filters.filtersActive}
        clearAll={filters.clearAll}
        enabled={PICKER_FILTERS}
        resultCount={filteredTemplates.length}
        searchPlaceholder="Search sessions…"
      />

      <BankActivityFilter
        visibleActivities={visibleActivities}
        activeTagFilter={activeTagFilter}
        setActiveTagFilter={setActiveTagFilter}
        onAddActivity={onAddActivity}
        onRemoveActivity={onRemoveActivity}
      />

      {scopeLoading ? (
        <div className="pb-empty-copy">Loading sessions…</div>
      ) : filteredTemplates.length === 0 ? (
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
