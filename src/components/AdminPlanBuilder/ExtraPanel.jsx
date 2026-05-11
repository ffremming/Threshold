import BuilderPanelHeader from './BuilderPanelHeader'
import BankPickerWindow from './BankPickerWindow'

export default function ExtraPanel({
  bankWindows,
  visiblePanelIds,
  movePanel,
  templates,
  handleTemplateDragStart,
  handleDragEnd,
  handleAddTemplateClick,
  handleRemoveBankWindow,
  onEditTemplate,
  onDeleteTemplate,
  visibleActivities,
  addVisibleActivity,
  removeVisibleActivity,
}) {
  if (bankWindows.length === 0) return null

  return (
    <aside className="pb-panel pb-panel--extra">
      <BuilderPanelHeader
        title="Vinduer"
        panelId="extra"
        visiblePanelIds={visiblePanelIds}
        onMove={movePanel}
      />

      <div className="pb-extra-list">
        {bankWindows.map((window, index) => (
          <BankPickerWindow
            key={window.id}
            windowNumber={index + 2}
            templates={templates}
            onDragStart={handleTemplateDragStart}
            onDragEnd={handleDragEnd}
            onAddTemplate={handleAddTemplateClick}
            canRemove
            onRemove={() => handleRemoveBankWindow(window.id)}
            onEditTemplate={onEditTemplate}
            onDeleteTemplate={onDeleteTemplate}
            visibleActivities={visibleActivities}
            onAddActivity={addVisibleActivity}
            onRemoveActivity={removeVisibleActivity}
          />
        ))}
      </div>
    </aside>
  )
}
