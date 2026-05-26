import { Check, Plus } from 'lucide-react'
import { Button, EmptyState, TemplateCard } from '../ui'

export default function ResultsGrid({
  loading,
  filtered,
  globalTemplates,
  filtersActive,
  onClear,
  isAlreadyInBank,
  pendingAddIds,
  onAdd,
  isSuperadmin,
  onEditGlobal,
  onDeleteGlobal,
}) {
  if (loading) {
    return <EmptyState title="Loading library…" description="Fetching global session templates." />
  }

  if (filtered.length === 0) {
    return (
      <EmptyState
        title="No sessions match the filter"
        description={
          globalTemplates.length === 0
            ? 'Library collection is empty. Run the seed script (npm run seed-global-templates).'
            : 'Try removing a filter or changing the search.'
        }
        action={filtersActive ? <Button variant="secondary" onClick={onClear}>Clear filter</Button> : null}
      />
    )
  }

  return (
    <>
      <div className="tp-results-count">
        {filtered.length} of {globalTemplates.length} sessions
      </div>
      <div className="tp-card-grid">
        {filtered.map(template => {
          const inBank = isAlreadyInBank(template)
          const pending = pendingAddIds.has(template.id)
          return (
            <TemplateCard
              key={template.id}
              template={template}
              primaryLabel={
                <>
                  {inBank
                    ? <Check size={16} aria-hidden="true" />
                    : <Plus size={16} aria-hidden="true" />}
                  {pending
                    ? 'Adding…'
                    : inBank
                      ? 'In session bank'
                      : 'Add to session bank'}
                </>
              }
              primaryActive={inBank}
              primaryVariant={inBank ? 'secondary' : 'primary'}
              primaryDisabled={pending}
              onPrimary={() => onAdd(template)}
              onEdit={isSuperadmin && onEditGlobal ? () => onEditGlobal(template) : null}
              onDelete={isSuperadmin && onDeleteGlobal ? () => onDeleteGlobal(template) : null}
            />
          )
        })}
      </div>
    </>
  )
}
