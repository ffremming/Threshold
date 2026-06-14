import { Plus } from 'lucide-react'
import BuilderPanelHeader from './BuilderPanelHeader'
import BankPickerWindow from './BankPickerWindow'

export default function BankPanel({
  visiblePanelIds,
  onCreateTemplate,
  loadingTemplates,
  templates,
  globalTemplates,
  loadingGlobalTemplates,
  athleteSessions,
  loadingAthleteSessions,
  hasAthlete,
  handleTemplateDragStart,
  handleDragEnd,
  handleAddTemplateClick,
  visibleActivities,
  addVisibleActivity,
  removeVisibleActivity,
}) {
  return (
    <aside className="pb-panel pb-panel--bank">
      <BuilderPanelHeader
        title="Session picker"
        panelId="bank"
        visiblePanelIds={visiblePanelIds}
      >
        {onCreateTemplate && (
          <button type="button" className="pb-mini-btn" onClick={onCreateTemplate}>
            <Plus className="pb-btn-icon" aria-hidden="true" strokeWidth={2} />
            New template
          </button>
        )}
      </BuilderPanelHeader>

      <BankPickerWindow
        templates={templates}
        loadingTemplates={loadingTemplates}
        globalTemplates={globalTemplates}
        loadingGlobalTemplates={loadingGlobalTemplates}
        athleteSessions={athleteSessions}
        loadingAthleteSessions={loadingAthleteSessions}
        hasAthlete={hasAthlete}
        onDragStart={handleTemplateDragStart}
        onDragEnd={handleDragEnd}
        onAddTemplate={handleAddTemplateClick}
        visibleActivities={visibleActivities}
        onAddActivity={addVisibleActivity}
        onRemoveActivity={removeVisibleActivity}
      />
    </aside>
  )
}
