import BuilderPanelHeader from './BuilderPanelHeader'
import BankPickerWindow from './BankPickerWindow'

export default function BankPanel({
  visiblePanelIds,
  movePanel,
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
        onMove={movePanel}
      >
        {onCreateTemplate && (
          <button type="button" className="pb-mini-btn" onClick={onCreateTemplate}>
            + Ny mal
          </button>
        )}
        <button type="button" className="pb-mini-btn" onClick={handleAddBankWindow}>
          + Vindu
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
