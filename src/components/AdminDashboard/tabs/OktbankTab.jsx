import { useMemo, useState } from 'react'
import { Plus } from 'lucide-react'
import {
  ACTIVITY_TAG_MAP,
  TEMPLATE_CATEGORIES,
} from '../../../utils'
import {
  Button,
  Page,
  EmptyState,
  Toolbar,
  ToolbarGroup,
  SearchBox,
  Chip,
  SportPicker,
  TemplateCard as UITemplateCard,
} from '../../ui'

export default function OktbankTab({
  templates,
  activeCategory,
  setActiveCategory,
  loadingTemplates,
  pickingFromBank,
  replacementTarget,
  currentWeek,
  handleAddFromTemplate,
  startEditTemplate,
  handleDeleteTemplate,
  startNewTemplate,
}) {
  const [search, setSearch] = useState('')
  const [activitySet, setActivitySet] = useState([])

  const sportCounts = useMemo(() => {
    const counts = new Map()
    templates.forEach(t => {
      if (!t.activityTag) return
      counts.set(t.activityTag, (counts.get(t.activityTag) || 0) + 1)
    })
    return counts
  }, [templates])

  const presentSportValues = useMemo(() => Array.from(sportCounts.keys()), [sportCounts])

  const filtered = useMemo(() => {
    return templates
      .filter(t => activeCategory === 'All' || t.category === activeCategory)
      .filter(t => activitySet.length === 0 || activitySet.includes(t.activityTag))
      .filter(t => {
        if (!search.trim()) return true
        const term = search.trim().toLowerCase()
        const haystack = [t.title, t.description, t.notes, t.category, ACTIVITY_TAG_MAP[t.activityTag]?.label]
          .filter(Boolean).join(' ').toLowerCase()
        return haystack.includes(term)
      })
  }, [templates, activeCategory, activitySet, search])

  const filtersActive = search.length > 0 || activitySet.length > 0 || activeCategory !== 'All'

  function clearAll() {
    setSearch('')
    setActivitySet([])
    setActiveCategory('All')
  }

  return (
    <Page>
      <Toolbar>
        <SearchBox value={search} onChange={setSearch} placeholder="Search my templates…" />
        <ToolbarGroup label="Sport">
          <SportPicker
            value={activitySet}
            onChange={setActivitySet}
            counts={sportCounts}
            limitToValues={presentSportValues}
          />
        </ToolbarGroup>
        <ToolbarGroup label="Category">
          <Chip active={activeCategory === 'All'} onClick={() => setActiveCategory('All')}>All</Chip>
          {TEMPLATE_CATEGORIES.filter(cat => cat !== 'All').map(cat => (
            <Chip key={cat} active={activeCategory === cat} onClick={() => setActiveCategory(cat)}>
              {cat}
            </Chip>
          ))}
        </ToolbarGroup>
        {filtersActive && (
          <Button variant="ghost" size="sm" onClick={clearAll}>Clear filter</Button>
        )}
        {!pickingFromBank && (
          <Button onClick={startNewTemplate} className="tp-toolbar-action">
            <Plus size={16} strokeWidth={2} aria-hidden="true" />
            New template
          </Button>
        )}
      </Toolbar>

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
          <div className="tp-results-count">{filtered.length} of {templates.length} templates</div>
          <div className="tp-card-grid">
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
