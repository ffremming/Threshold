import { useMemo } from 'react'
import { Plus } from 'lucide-react'
import {
  Button,
  Page,
  EmptyState,
  SessionFilterBar,
  TemplateCard as UITemplateCard,
} from '../../ui'
import { useSessionFilters } from '../../../App/hooks/useSessionFilters'
import { makeMuscleResolver } from '../../dimensions/useMuscleResolver'

const resolveMuscles = makeMuscleResolver()

const BANK_FILTERS = ['search', 'activities', 'templateCategory', 'types', 'categories', 'zones', 'duration']

export default function OktbankTab({
  templates,
  loadingTemplates,
  pickingFromBank,
  replacementTarget,
  handleAddFromTemplate,
  startEditTemplate,
  handleDeleteTemplate,
  startNewTemplate,
}) {
  const filters = useSessionFilters(templates, { enabled: BANK_FILTERS, resolveMuscles })

  const sportCounts = useMemo(() => {
    const counts = new Map()
    templates.forEach(t => {
      if (!t.activityTag) return
      counts.set(t.activityTag, (counts.get(t.activityTag) || 0) + 1)
    })
    return counts
  }, [templates])

  const presentSportValues = useMemo(() => Array.from(sportCounts.keys()), [sportCounts])
  const { filtered, filtersActive, clearAll } = filters

  return (
    <Page>
      <SessionFilterBar
        criteria={filters.criteria}
        set={filters.set}
        filtersActive={filtersActive}
        clearAll={clearAll}
        enabled={BANK_FILTERS}
        sportCounts={sportCounts}
        presentSportValues={presentSportValues}
        searchPlaceholder="Search my templates…"
        trailingAction={!pickingFromBank ? (
          <Button onClick={startNewTemplate}>
            <Plus size={16} strokeWidth={2} aria-hidden="true" />
            New template
          </Button>
        ) : null}
      />

      {loadingTemplates ? (
        <EmptyState title="Loading templates…" />
      ) : filtered.length === 0 ? (
        <EmptyState
          title={templates.length === 0 ? 'No templates yet' : 'No templates match the filter'}
          description={
            templates.length === 0
              ? 'Create your own templates or add sessions from the library.'
              : 'Try a different search or remove a filter.'
          }
          action={
            templates.length === 0
              ? (
                <Button onClick={startNewTemplate}>
                  <Plus size={16} strokeWidth={2} aria-hidden="true" />
                  New template
                </Button>
              )
              : (filtersActive ? <Button variant="secondary" onClick={clearAll}>Clear filter</Button> : null)
          }
        />
      ) : (
        <>
          <div className="th-results-count">{filtered.length} of {templates.length} templates</div>
          <div className="th-card-grid">
            {filtered.map(template => {
              const canEdit = template.source === 'custom'
              return (
                <UITemplateCard
                  key={template.id}
                  template={template}
                  primaryLabel={pickingFromBank ? (replacementTarget ? 'Swap session' : 'Add to plan') : (canEdit ? 'Edit' : null)}
                  onPrimary={pickingFromBank ? () => handleAddFromTemplate(template) : (canEdit ? () => startEditTemplate(template) : null)}
                  primaryVariant={pickingFromBank ? 'primary' : 'secondary'}
                  onDelete={!pickingFromBank && canEdit ? () => handleDeleteTemplate(template) : null}
                />
              )
            })}
          </div>
        </>
      )}
    </Page>
  )
}
