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
    return <EmptyState title="Laster bibliotek…" description="Henter globale øktmaler." />
  }

  if (filtered.length === 0) {
    return (
      <EmptyState
        title="Ingen økter matcher filteret"
        description={
          globalTemplates.length === 0
            ? 'Bibliotek-collection er tom. Kjør seed-skriptet (npm run seed-global-templates).'
            : 'Prøv å fjerne et filter eller endre søket.'
        }
        action={filtersActive ? <Button variant="secondary" onClick={onClear}>Tøm filter</Button> : null}
      />
    )
  }

  return (
    <>
      <div className="tp-results-count">
        {filtered.length} av {globalTemplates.length} økter
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
                    ? 'Legger til…'
                    : inBank
                      ? 'I øktbanken'
                      : 'Legg til i øktbank'}
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
