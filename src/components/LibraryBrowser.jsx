import { useMemo, useState } from 'react'
import {
  ACTIVITY_TAGS,
  ACTIVITY_TAG_MAP,
  LOAD_TAG_MAP,
  formatIntensityZoneLabel,
  normalizeIntensityZones,
} from '../utils'
import { TEMPLATE_CATEGORIES } from '../workoutTemplates'
import ActivityIcon from './ActivityIcon'
import SystemIcon from './SystemIcon'

const INTENSITY_ZONES = [1, 2, 3, 4, 5]

function matchesSearch(template, term) {
  if (!term) return true
  const haystack = [
    template.title,
    template.description,
    template.sessionDetails,
    template.notes,
    template.category,
    ACTIVITY_TAG_MAP[template.activityTag]?.label,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase()
  return haystack.includes(term.toLowerCase())
}

export default function LibraryBrowser({
  globalTemplates,
  loading,
  onAddToBank,
  isAlreadyInBank,
  isSuperadmin = false,
  onEditGlobal,
  onDeleteGlobal,
  onCreateGlobal,
}) {
  const [search, setSearch] = useState('')
  const [activitySet, setActivitySet] = useState(() => new Set())
  const [category, setCategory] = useState('Alle')
  const [zoneSet, setZoneSet] = useState(() => new Set())
  const [pendingAddIds, setPendingAddIds] = useState(() => new Set())

  function toggleSet(setter, value) {
    setter(prev => {
      const next = new Set(prev)
      if (next.has(value)) next.delete(value)
      else next.add(value)
      return next
    })
  }

  const filtered = useMemo(() => {
    return globalTemplates
      .filter(t => matchesSearch(t, search.trim()))
      .filter(t => activitySet.size === 0 || activitySet.has(t.activityTag))
      .filter(t => category === 'Alle' || t.category === category)
      .filter(t => {
        if (zoneSet.size === 0) return true
        const zones = normalizeIntensityZones(t.type, t.intensityZone)
        return zones.some(z => zoneSet.has(z))
      })
  }, [globalTemplates, search, activitySet, category, zoneSet])

  const sportCounts = useMemo(() => {
    const counts = new Map()
    globalTemplates.forEach(t => {
      if (!t.activityTag) return
      counts.set(t.activityTag, (counts.get(t.activityTag) || 0) + 1)
    })
    return counts
  }, [globalTemplates])

  async function handleAdd(template) {
    if (pendingAddIds.has(template.id)) return
    setPendingAddIds(prev => new Set(prev).add(template.id))
    try {
      await onAddToBank(template)
    } finally {
      setPendingAddIds(prev => {
        const next = new Set(prev)
        next.delete(template.id)
        return next
      })
    }
  }

  return (
    <div className="library-browser">
      <header className="library-header">
        <div className="library-header-titles">
          <h2 className="library-title">Bibliotek</h2>
          <p className="library-subtitle">
            {globalTemplates.length} økter · søk og filtrer · legg til i din øktbank
          </p>
        </div>
        {isSuperadmin && onCreateGlobal && (
          <button type="button" className="library-admin-btn" onClick={onCreateGlobal}>
            + Ny i bibliotek
          </button>
        )}
      </header>

      <div className="library-search-row">
        <input
          type="search"
          className="library-search"
          placeholder="Søk i økter (tittel, beskrivelse, kategori, sport)..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        {search && (
          <button type="button" className="library-clear-btn" onClick={() => setSearch('')}>
            Tøm
          </button>
        )}
      </div>

      <div className="library-filters">
        <div className="library-filter-block">
          <span className="library-filter-label">Kategori</span>
          <div className="library-filter-row">
            <button
              type="button"
              className={`library-chip${category === 'Alle' ? ' active' : ''}`}
              onClick={() => setCategory('Alle')}
            >
              Alle
            </button>
            {TEMPLATE_CATEGORIES.map(cat => (
              <button
                key={cat}
                type="button"
                className={`library-chip${category === cat ? ' active' : ''}`}
                onClick={() => setCategory(cat)}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        <div className="library-filter-block">
          <span className="library-filter-label">Sport</span>
          <div className="library-filter-row">
            {ACTIVITY_TAGS.map(tag => {
              const count = sportCounts.get(tag.value) || 0
              if (count === 0 && !activitySet.has(tag.value)) return null
              const active = activitySet.has(tag.value)
              return (
                <button
                  key={tag.value}
                  type="button"
                  className={`library-chip library-chip-sport${active ? ' active' : ''}`}
                  style={active ? { background: tag.bg, color: tag.color, borderColor: tag.color } : undefined}
                  onClick={() => toggleSet(setActivitySet, tag.value)}
                >
                  <span className="library-chip-icon" aria-hidden="true">
                    <ActivityIcon name={tag.icon} className="tag-icon-svg" />
                  </span>
                  <span>{tag.label}</span>
                  <span className="library-chip-count">{count}</span>
                </button>
              )
            })}
          </div>
        </div>

        <div className="library-filter-block">
          <span className="library-filter-label">Intensitetssone</span>
          <div className="library-filter-row">
            {INTENSITY_ZONES.map(zone => (
              <button
                key={zone}
                type="button"
                className={`zone-btn zone-btn-${zone}${zoneSet.has(zone) ? ' active' : ''}`}
                onClick={() => toggleSet(setZoneSet, zone)}
              >
                S{zone}
              </button>
            ))}
          </div>
        </div>
      </div>

      {loading ? (
        <div className="empty-state">Laster bibliotek...</div>
      ) : filtered.length === 0 ? (
        <div className="empty-state">
          <div>Ingen økter matcher filteret.</div>
          {globalTemplates.length === 0 && (
            <p className="library-empty-hint">
              Bibliotek-collection er tom. Kjør seed-skriptet (scripts/seed-global-templates.mjs).
            </p>
          )}
        </div>
      ) : (
        <div className="library-grid">
          {filtered.map(template => (
            <LibraryCard
              key={template.id}
              template={template}
              onAdd={() => handleAdd(template)}
              alreadyInBank={isAlreadyInBank(template)}
              pending={pendingAddIds.has(template.id)}
              showAdminTools={isSuperadmin}
              onEdit={onEditGlobal ? () => onEditGlobal(template) : null}
              onDelete={onDeleteGlobal ? () => onDeleteGlobal(template) : null}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function LibraryCard({ template, onAdd, alreadyInBank, pending, showAdminTools, onEdit, onDelete }) {
  const tag = ACTIVITY_TAG_MAP[template.activityTag]
  const loadTag = template.loadTag ? LOAD_TAG_MAP[template.loadTag] : null
  const intensityLabel = formatIntensityZoneLabel(normalizeIntensityZones(template.type, template.intensityZone))

  return (
    <article
      className="library-card"
      style={{
        borderLeftColor: loadTag?.color || tag?.color || '#cbd5e1',
      }}
    >
      <div className="library-card-head">
        <span className="library-card-icon" style={tag ? { background: tag.bg, color: tag.color } : undefined}>
          <ActivityIcon name={tag?.icon || 'annet'} className="ui-icon" />
        </span>
        <div className="library-card-titles">
          <h3 className="library-card-title">{template.title}</h3>
          <div className="library-card-meta">
            {tag?.label && <span>{tag.label}</span>}
            {template.category && <span>· {template.category}</span>}
            {intensityLabel && <span>· {intensityLabel}</span>}
          </div>
        </div>
      </div>

      {template.description && (
        <p className="library-card-desc">{template.description}</p>
      )}

      <div className="library-card-tags">
        {loadTag && (
          <span className="library-load-pill" style={{ background: loadTag.bg, color: loadTag.color }}>
            {loadTag.label}
          </span>
        )}
        {template.distance && <span className="library-meta-pill">{template.distance}</span>}
        {template.warmup && <span className="library-meta-pill">Oppv: {template.warmup}</span>}
      </div>

      <div className="library-card-actions">
        <button
          type="button"
          className={`library-add-btn${alreadyInBank ? ' added' : ''}`}
          onClick={onAdd}
          disabled={pending}
        >
          {pending ? 'Legger til...' : alreadyInBank ? '✓ Lagt til (legg til igjen)' : '+ Legg til min øktbank'}
        </button>
        {showAdminTools && onEdit && (
          <button type="button" className="library-icon-btn" onClick={onEdit} title="Rediger i bibliotek">
            <SystemIcon name="edit" className="system-icon" />
          </button>
        )}
        {showAdminTools && onDelete && (
          <button type="button" className="library-icon-btn library-danger-btn" onClick={onDelete} title="Slett fra bibliotek">
            <SystemIcon name="delete" className="system-icon" />
          </button>
        )}
      </div>
    </article>
  )
}
