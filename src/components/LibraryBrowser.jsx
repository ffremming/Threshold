import { useMemo, useState } from 'react'
import {
  ACTIVITY_TAG_MAP,
  formatIntensityZoneLabel,
  normalizeIntensityZones,
} from '../utils'
import { TEMPLATE_CATEGORIES } from '../workoutTemplates'
import {
  Button,
  Page,
  PageHeader,
  Toolbar,
  ToolbarGroup,
  SearchBox,
  Chip,
  EmptyState,
  SportPicker,
  TemplateCard,
} from './ui'
import './LibraryBrowser.css'

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
  const [activitySet, setActivitySet] = useState([])
  const [category, setCategory] = useState('Alle')
  const [zoneSet, setZoneSet] = useState(() => new Set())
  const [pendingAddIds, setPendingAddIds] = useState(() => new Set())

  function toggleZone(value) {
    setZoneSet(prev => {
      const next = new Set(prev)
      if (next.has(value)) next.delete(value)
      else next.add(value)
      return next
    })
  }

  const sportCounts = useMemo(() => {
    const counts = new Map()
    globalTemplates.forEach(t => {
      if (!t.activityTag) return
      counts.set(t.activityTag, (counts.get(t.activityTag) || 0) + 1)
    })
    return counts
  }, [globalTemplates])

  const filtered = useMemo(() => {
    return globalTemplates
      .filter(t => matchesSearch(t, search.trim()))
      .filter(t => activitySet.length === 0 || activitySet.includes(t.activityTag))
      .filter(t => category === 'Alle' || t.category === category)
      .filter(t => {
        if (zoneSet.size === 0) return true
        const zones = normalizeIntensityZones(t.type, t.intensityZone)
        return zones.some(z => zoneSet.has(z))
      })
  }, [globalTemplates, search, activitySet, category, zoneSet])

  const presentSportValues = useMemo(() => Array.from(sportCounts.keys()), [sportCounts])

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

  function clearAll() {
    setSearch('')
    setActivitySet([])
    setCategory('Alle')
    setZoneSet(new Set())
  }

  const filtersActive =
    search.length > 0 ||
    activitySet.length > 0 ||
    category !== 'Alle' ||
    zoneSet.size > 0

  return (
    <Page>
      <PageHeader
        eyebrow="Bibliotek"
        title="Globalt øktbibliotek"
        subtitle={`${globalTemplates.length} økter · søk og filtrer · legg til i din øktbank`}
        actions={isSuperadmin && onCreateGlobal ? (
          <Button onClick={onCreateGlobal}>+ Ny i bibliotek</Button>
        ) : null}
      />

      <Toolbar>
        <SearchBox value={search} onChange={setSearch} placeholder="Søk økter (tittel, beskrivelse, sport)…" />

        <ToolbarGroup label="Sport">
          <SportPicker
            value={activitySet}
            onChange={setActivitySet}
            counts={sportCounts}
            limitToValues={presentSportValues}
          />
        </ToolbarGroup>

        <ToolbarGroup label="Kategori">
          <Chip active={category === 'Alle'} onClick={() => setCategory('Alle')}>Alle</Chip>
          {TEMPLATE_CATEGORIES.filter(cat => cat !== 'Alle').map(cat => (
            <Chip key={cat} active={category === cat} onClick={() => setCategory(cat)}>{cat}</Chip>
          ))}
        </ToolbarGroup>

        <ToolbarGroup label="Sone">
          {INTENSITY_ZONES.map(zone => (
            <button
              key={zone}
              type="button"
              className={`tp-zone-btn tp-zone-${zone}${zoneSet.has(zone) ? ' is-active' : ''}`}
              onClick={() => toggleZone(zone)}
            >S{zone}</button>
          ))}
        </ToolbarGroup>

        {filtersActive && (
          <Button variant="ghost" size="sm" onClick={clearAll}>Tøm filter</Button>
        )}
      </Toolbar>

      {loading ? (
        <EmptyState title="Laster bibliotek…" description="Henter globale øktmaler." />
      ) : filtered.length === 0 ? (
        <EmptyState
          title="Ingen økter matcher filteret"
          description={
            globalTemplates.length === 0
              ? 'Bibliotek-collection er tom. Kjør seed-skriptet (npm run seed-global-templates).'
              : 'Prøv å fjerne et filter eller endre søket.'
          }
          action={filtersActive ? <Button variant="secondary" onClick={clearAll}>Tøm filter</Button> : null}
        />
      ) : (
        <>
          <div className="tp-results-count">
            {filtered.length} av {globalTemplates.length} økter
          </div>
          <div className="tp-card-grid">
            {filtered.map(template => {
              const inBank = isAlreadyInBank(template)
              return (
                <TemplateCard
                  key={template.id}
                  template={template}
                  primaryLabel={inBank ? '✓ Lagt til (legg til igjen)' : '+ Legg til min øktbank'}
                  primaryActive={inBank}
                  primaryVariant={inBank ? 'secondary' : 'primary'}
                  primaryDisabled={pendingAddIds.has(template.id)}
                  onPrimary={() => handleAdd(template)}
                  onEdit={isSuperadmin && onEditGlobal ? () => onEditGlobal(template) : null}
                  onDelete={isSuperadmin && onDeleteGlobal ? () => onDeleteGlobal(template) : null}
                />
              )
            })}
          </div>
        </>
      )}
    </Page>
  )
}
