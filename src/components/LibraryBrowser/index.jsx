import { useMemo, useState } from 'react'
import {
  ACTIVITY_TAG_MAP,
  normalizeIntensityZones,
} from '../../utils'
import { Button, Page, PageHeader } from '../ui'
import FilterBar from './FilterBar'
import ResultsGrid from './ResultsGrid'
import '../LibraryBrowser.css'

function matchesSearch(template, term) {
  if (!term) return true
  const tags = Array.isArray(template.tags) ? template.tags : []
  const haystack = [
    template.title,
    template.description,
    template.sessionDetails,
    template.notes,
    template.category,
    template.type,
    template.activityTag,
    ACTIVITY_TAG_MAP[template.activityTag]?.label,
    ...tags,
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

      <FilterBar
        search={search} onSearch={setSearch}
        activitySet={activitySet} onActivityChange={setActivitySet}
        sportCounts={sportCounts} presentSportValues={presentSportValues}
        category={category} onCategoryChange={setCategory}
        zoneSet={zoneSet} onToggleZone={toggleZone}
        filtersActive={filtersActive} onClear={clearAll}
      />

      <ResultsGrid
        loading={loading}
        filtered={filtered}
        globalTemplates={globalTemplates}
        filtersActive={filtersActive}
        onClear={clearAll}
        isAlreadyInBank={isAlreadyInBank}
        pendingAddIds={pendingAddIds}
        onAdd={handleAdd}
        isSuperadmin={isSuperadmin}
        onEditGlobal={onEditGlobal}
        onDeleteGlobal={onDeleteGlobal}
      />
    </Page>
  )
}
