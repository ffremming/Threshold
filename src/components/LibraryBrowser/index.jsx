import { useMemo, useState } from 'react'
import { Plus } from 'lucide-react'
import { Button, Page, SessionFilterBar } from '../ui'
import { useSessionFilters } from '../../App/hooks/useSessionFilters'
import { makeMuscleResolver } from '../dimensions/useMuscleResolver'
import ResultsGrid from './ResultsGrid'
import '../LibraryBrowser.css'

const resolveMuscles = makeMuscleResolver()

const LIBRARY_FILTERS = [
  'search', 'activities', 'templateCategory', 'types', 'categories', 'zones', 'duration',
]

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
  const [pendingAddIds, setPendingAddIds] = useState(() => new Set())

  const filters = useSessionFilters(globalTemplates, {
    enabled: LIBRARY_FILTERS,
    resolveMuscles,
  })

  const sportCounts = useMemo(() => {
    const counts = new Map()
    globalTemplates.forEach(t => {
      if (!t.activityTag) return
      counts.set(t.activityTag, (counts.get(t.activityTag) || 0) + 1)
    })
    return counts
  }, [globalTemplates])

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

  return (
    <Page>
      <SessionFilterBar
        criteria={filters.criteria}
        set={filters.set}
        filtersActive={filters.filtersActive}
        clearAll={filters.clearAll}
        enabled={LIBRARY_FILTERS}
        sportCounts={sportCounts}
        presentSportValues={presentSportValues}
        trailingAction={isSuperadmin && onCreateGlobal ? (
          <Button onClick={onCreateGlobal}>
            <Plus size={16} aria-hidden="true" />
            New in library
          </Button>
        ) : null}
      />

      <ResultsGrid
        loading={loading}
        filtered={filters.filtered}
        globalTemplates={globalTemplates}
        filtersActive={filters.filtersActive}
        onClear={filters.clearAll}
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
