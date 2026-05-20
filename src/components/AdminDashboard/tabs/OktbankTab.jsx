import { useMemo, useState } from 'react'
import { Plus } from 'lucide-react'
import {
  ACTIVITY_TAG_MAP,
  TEMPLATE_CATEGORIES,
} from '../../../utils'
import {
  Button,
  Page,
  PageHeader,
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
      .filter(t => activeCategory === 'Alle' || t.category === activeCategory)
      .filter(t => activitySet.length === 0 || activitySet.includes(t.activityTag))
      .filter(t => {
        if (!search.trim()) return true
        const term = search.trim().toLowerCase()
        const haystack = [t.title, t.description, t.notes, t.category, ACTIVITY_TAG_MAP[t.activityTag]?.label]
          .filter(Boolean).join(' ').toLowerCase()
        return haystack.includes(term)
      })
  }, [templates, activeCategory, activitySet, search])

  const filtersActive = search.length > 0 || activitySet.length > 0 || activeCategory !== 'Alle'

  function clearAll() {
    setSearch('')
    setActivitySet([])
    setActiveCategory('Alle')
  }

  return (
    <Page>
      <PageHeader
        eyebrow="Øktbank"
        title={pickingFromBank ? `Velg økt for uke ${currentWeek}` : 'Mine øktmaler'}
        subtitle={
          pickingFromBank
            ? (replacementTarget
              ? `Trykk på en økt for å bytte ut «${replacementTarget.title}»`
              : 'Trykk på en økt for å legge den til i planen')
            : `${templates.length} ${templates.length === 1 ? 'mal' : 'maler'} · trykk for å redigere`
        }
        actions={!pickingFromBank ? (
          <Button onClick={startNewTemplate}>
            <Plus size={16} strokeWidth={2} aria-hidden="true" />
            Ny mal
          </Button>
        ) : null}
      />

      <Toolbar>
        <SearchBox value={search} onChange={setSearch} placeholder="Søk i mine maler…" />
        <ToolbarGroup label="Sport">
          <SportPicker
            value={activitySet}
            onChange={setActivitySet}
            counts={sportCounts}
            limitToValues={presentSportValues}
          />
        </ToolbarGroup>
        <ToolbarGroup label="Kategori">
          <Chip active={activeCategory === 'Alle'} onClick={() => setActiveCategory('Alle')}>Alle</Chip>
          {TEMPLATE_CATEGORIES.filter(cat => cat !== 'Alle').map(cat => (
            <Chip key={cat} active={activeCategory === cat} onClick={() => setActiveCategory(cat)}>
              {cat}
            </Chip>
          ))}
        </ToolbarGroup>
        {filtersActive && (
          <Button variant="ghost" size="sm" onClick={clearAll}>Tøm filter</Button>
        )}
      </Toolbar>

      {loadingTemplates ? (
        <EmptyState title="Laster maler…" />
      ) : filtered.length === 0 ? (
        <EmptyState
          title={templates.length === 0 ? 'Ingen maler enda' : 'Ingen maler matcher filteret'}
          description={
            templates.length === 0
              ? 'Lag dine egne maler eller legg til økter fra biblioteket.'
              : 'Prøv et annet søk eller fjern filter.'
          }
          action={
            templates.length === 0
              ? (
                <Button onClick={startNewTemplate}>
                  <Plus size={16} strokeWidth={2} aria-hidden="true" />
                  Ny mal
                </Button>
              )
              : (filtersActive ? <Button variant="secondary" onClick={clearAll}>Tøm filter</Button> : null)
          }
        />
      ) : (
        <>
          <div className="tp-results-count">{filtered.length} av {templates.length} maler</div>
          <div className="tp-card-grid">
            {filtered.map(template => {
              const canEdit = template.source === 'custom'
              return (
                <UITemplateCard
                  key={template.id}
                  template={template}
                  primaryLabel={pickingFromBank ? (replacementTarget ? 'Bytt ut økt' : 'Legg til i plan') : (canEdit ? 'Rediger' : null)}
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
