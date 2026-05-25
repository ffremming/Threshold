import { Plus } from 'lucide-react'
import BuilderPanelHeader from './BuilderPanelHeader'
import BankPickerWindow from './BankPickerWindow'

export default function BankPanel({
  visiblePanelIds,
  onCreateTemplate,
  handleAddBankWindow,
  loadingTemplates,
  templates,
  handleTemplateDragStart,
  handleDragEnd,
  handleAddTemplateClick,
  onEditTemplate,
  onDeleteTemplate,
  visibleActivities,
  addVisibleActivity,
  removeVisibleActivity,
}) {
  return (
    <aside className="pb-panel pb-panel--bank">
      <BuilderPanelHeader
        title="Øktvelger"
        panelId="bank"
        visiblePanelIds={visiblePanelIds}
      >
        {onCreateTemplate && (
          <button type="button" className="pb-mini-btn" onClick={onCreateTemplate}>
            <Plus className="pb-btn-icon" aria-hidden="true" strokeWidth={2} />
            Ny mal
          </button>
        )}
        <button type="button" className="pb-mini-btn" onClick={handleAddBankWindow}>
          <Plus className="pb-btn-icon" aria-hidden="true" strokeWidth={2} />
          Vindu
        </button>
      </BuilderPanelHeader>

      {loadingTemplates ? (
        <div className="pb-empty-state">Laster økter…</div>
      ) : (
        <div className="pb-bank-grid">
          <BankPickerWindow
            isPrimary
            templates={templates}
            onDragStart={handleTemplateDragStart}
            onDragEnd={handleDragEnd}
            onAddTemplate={handleAddTemplateClick}
            canRemove={false}
            onRemove={() => {}}
            onEditTemplate={onEditTemplate}
            onDeleteTemplate={onDeleteTemplate}
            visibleActivities={visibleActivities}
            onAddActivity={addVisibleActivity}
            onRemoveActivity={removeVisibleActivity}
          />
        </div>
      )}
    </aside>
  )
}
