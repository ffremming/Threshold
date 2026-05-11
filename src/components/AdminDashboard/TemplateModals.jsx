import WorkoutForm from '../WorkoutForm'
import SystemIcon from '../SystemIcon'

export function TemplateEditorModal({ editingTemplate, templateForm, setTemplateForm, onSave, onClose }) {
  if (editingTemplate === null) return null
  return (
    <div className="modal-backdrop" onClick={event => {
      if (event.target === event.currentTarget) onClose()
    }}>
      <div className="modal add-modal">
        <button className="modal-close" onClick={onClose}>
          <SystemIcon name="close" className="system-icon" />
        </button>
        <h2 className="modal-title-h2">{editingTemplate === 'new' ? 'Ny mal' : 'Rediger mal'}</h2>
        <form onSubmit={onSave}>
          <WorkoutForm value={templateForm} onChange={setTemplateForm} />
          <div className="form-actions form-actions--spaced">
            <button type="button" className="btn-cancel" onClick={onClose}>Avbryt</button>
            <button type="submit" className="btn-save">Lagre mal</button>
          </div>
        </form>
      </div>
    </div>
  )
}

export function GlobalTemplateEditorModal({ editingGlobalTemplate, globalTemplateForm, setGlobalTemplateForm, onSave, onClose }) {
  if (editingGlobalTemplate === null) return null
  return (
    <div className="modal-backdrop" onClick={event => {
      if (event.target === event.currentTarget) onClose()
    }}>
      <div className="modal add-modal">
        <button className="modal-close" onClick={onClose}>
          <SystemIcon name="close" className="system-icon" />
        </button>
        <h2 className="modal-title-h2">
          {editingGlobalTemplate === 'new' ? 'Ny økt i bibliotek' : 'Rediger bibliotekøkt'}
        </h2>
        <form onSubmit={onSave}>
          <WorkoutForm value={globalTemplateForm} onChange={setGlobalTemplateForm} />
          <div className="form-actions form-actions--spaced">
            <button type="button" className="btn-cancel" onClick={onClose}>Avbryt</button>
            <button type="submit" className="btn-save">Lagre i bibliotek</button>
          </div>
        </form>
      </div>
    </div>
  )
}
