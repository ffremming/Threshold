import { useMemo } from 'react'
import { EmptyState, Modal, SessionFilterBar, TemplateCard } from '../ui'
import { useSessionFilters } from '../../App/hooks/useSessionFilters'

const PICKER_FILTERS = ['search', 'activities', 'zones']

export default function BankPickerModal({ bankTemplates, onClose, onPick }) {
  const filters = useSessionFilters(bankTemplates, { enabled: PICKER_FILTERS })

  const sportCounts = useMemo(() => {
    const counts = new Map()
    bankTemplates.forEach(t => {
      if (!t.activityTag) return
      counts.set(t.activityTag, (counts.get(t.activityTag) || 0) + 1)
    })
    return counts
  }, [bankTemplates])
  const presentSportValues = useMemo(() => Array.from(sportCounts.keys()), [sportCounts])

  const { filtered } = filters

  return (
    <Modal
      open
      onClose={onClose}
      eyebrow="Session bank"
      title="Select session from the bank"
      size="lg"
    >
      <div className="th-pool-picker">
        <SessionFilterBar
          criteria={filters.criteria}
          set={filters.set}
          filtersActive={filters.filtersActive}
          clearAll={filters.clearAll}
          enabled={PICKER_FILTERS}
          sportCounts={sportCounts}
          presentSportValues={presentSportValues}
          searchPlaceholder="Search the bank…"
          resultCount={filtered.length}
        />
        {filtered.length === 0 ? (
          <EmptyState title="No matches" description="Try adjusting your search or removing a filter." />
        ) : (
          <div className="th-pool-picker-grid">
            {filtered.map(template => (
              <TemplateCard
                key={template.id}
                template={template}
                primaryLabel="Add"
                onPrimary={() => onPick(template)}
              />
            ))}
          </div>
        )}
      </div>
    </Modal>
  )
}
