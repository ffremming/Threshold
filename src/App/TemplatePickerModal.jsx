import { useMemo } from 'react'
import { EmptyState, Modal, SessionFilterBar, TemplateCard } from '../components/ui'
import { useSessionFilters } from './hooks/useSessionFilters'
import { makeMuscleResolver } from '../components/dimensions/useMuscleResolver'

const resolveMuscles = makeMuscleResolver()

const SWAP_FILTERS = ['search', 'activities', 'zones', 'categories']

export default function TemplatePickerModal({ targetWorkout, templates, loading, onClose, onPick }) {
  const filters = useSessionFilters(templates, { enabled: SWAP_FILTERS, resolveMuscles })

  const sportCounts = useMemo(() => {
    const counts = new Map()
    templates.forEach(t => {
      if (!t.activityTag) return
      counts.set(t.activityTag, (counts.get(t.activityTag) || 0) + 1)
    })
    return counts
  }, [templates])
  const presentSportValues = useMemo(() => Array.from(sportCounts.keys()), [sportCounts])

  const { filtered } = filters

  return (
    <Modal
      open
      onClose={onClose}
      eyebrow="Swap session"
      title={`Replace «${targetWorkout.title}»`}
      size="lg"
    >
      {loading ? (
        <EmptyState title="Loading session bank…" />
      ) : templates.length === 0 ? (
        <EmptyState title="Empty session bank" description="You have no sessions in the bank yet." />
      ) : (
        <>
          <div style={{ marginBottom: 'var(--th-space-3)' }}>
            <SessionFilterBar
              criteria={filters.criteria}
              set={filters.set}
              filtersActive={filters.filtersActive}
              clearAll={filters.clearAll}
              enabled={SWAP_FILTERS}
              sportCounts={sportCounts}
              presentSportValues={presentSportValues}
              resultCount={filtered.length}
            />
          </div>
          {filtered.length === 0 ? (
            <EmptyState
              title="No matches"
              description="Try a different search term or remove a filter."
            />
          ) : (
            <div className="ah-template-grid">
              {filtered.map(template => (
                <TemplateCard
                  key={template.id}
                  template={template}
                  primaryLabel="Swap to this"
                  onPrimary={() => onPick(template)}
                />
              ))}
            </div>
          )}
        </>
      )}
    </Modal>
  )
}
