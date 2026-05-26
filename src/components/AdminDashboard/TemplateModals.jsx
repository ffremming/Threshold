import WorkoutForm from '../WorkoutForm'
import { Button, Modal } from '../ui'

function TemplateFormModal({ open, onClose, eyebrow, title, value, onChange, onSave, saveLabel }) {
  if (!open) return null
  return (
    <Modal open onClose={onClose} eyebrow={eyebrow} title={title} size="lg">
      <form onSubmit={onSave}>
        <WorkoutForm value={value} onChange={onChange} />
        <div className="form-actions form-actions--spaced">
          <Button variant="secondary" type="button" onClick={onClose}>Cancel</Button>
          <Button type="submit">{saveLabel}</Button>
        </div>
      </form>
    </Modal>
  )
}

export function TemplateEditorModal({ editingTemplate, templateForm, setTemplateForm, onSave, onClose }) {
  return (
    <TemplateFormModal
      open={editingTemplate !== null}
      onClose={onClose}
      eyebrow="Session bank"
      title={editingTemplate === 'new' ? 'New template' : 'Edit template'}
      value={templateForm}
      onChange={setTemplateForm}
      onSave={onSave}
      saveLabel="Save template"
    />
  )
}

export function GlobalTemplateEditorModal({ editingGlobalTemplate, globalTemplateForm, setGlobalTemplateForm, onSave, onClose }) {
  return (
    <TemplateFormModal
      open={editingGlobalTemplate !== null}
      onClose={onClose}
      eyebrow="Library"
      title={editingGlobalTemplate === 'new' ? 'New session in library' : 'Edit library session'}
      value={globalTemplateForm}
      onChange={setGlobalTemplateForm}
      onSave={onSave}
      saveLabel="Save to library"
    />
  )
}
