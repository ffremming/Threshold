import { useState } from 'react'
import { Plus, Layers } from 'lucide-react'
import EditorPopover from './editors/EditorPopover'
import BankPickerWindow from './BankPickerWindow'

// Anchored popover for the per-day "+" in the plan builder. Two states:
//  - choice:  "Use existing…" (only when templates exist) / "Create new"
//  - picker:  embeds the exact bank picker; clicking a card places that template
// The popover owns no day context — the panel supplies day-aware callbacks.
export default function AddSessionMenu({
  at,
  templates = [],
  visibleActivities,
  onAddActivity,
  onRemoveActivity,
  onCreateNew,
  onPickTemplate,
  onClose,
}) {
  const [picking, setPicking] = useState(false)
  const hasTemplates = templates.length > 0

  function createNew() {
    onCreateNew()
    onClose()
  }

  function pick(template) {
    onPickTemplate(template)
    onClose()
  }

  return (
    <EditorPopover at={at} onClose={onClose} width={picking ? 420 : 220}>
      {picking ? (
        <div className="pb-add-menu-picker">
          <BankPickerWindow
            templates={templates}
            onDragStart={() => {}}
            onDragEnd={() => {}}
            onAddTemplate={pick}
            visibleActivities={visibleActivities}
            onAddActivity={onAddActivity}
            onRemoveActivity={onRemoveActivity}
          />
        </div>
      ) : (
        <div className="pb-add-menu">
          {hasTemplates && (
            <button type="button" className="pb-add-menu-item" onClick={() => setPicking(true)}>
              <Layers className="pb-btn-icon" aria-hidden="true" strokeWidth={2} />
              Use existing…
            </button>
          )}
          <button type="button" className="pb-add-menu-item" onClick={createNew}>
            <Plus className="pb-btn-icon" aria-hidden="true" strokeWidth={2} />
            Create new
          </button>
        </div>
      )}
    </EditorPopover>
  )
}
