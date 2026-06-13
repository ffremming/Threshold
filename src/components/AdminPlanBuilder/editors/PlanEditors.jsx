import BandEditor from './BandEditor'
import NoteEditor from './NoteEditor'
import GoalEditor from './GoalEditor'

// Renders whichever annotation editor is currently open, wired to the shared
// usePlanAnnotations controller. Drop this once per view.
export default function PlanEditors({ ann }) {
  const { editor, close } = ann
  if (!editor) return null
  if (editor.kind === 'band') {
    return (
      <BandEditor
        at={editor.at}
        draft={editor.draft}
        onSave={ann.saveBand}
        onRemove={ann.removeBand}
        onClose={close}
      />
    )
  }
  if (editor.kind === 'note') {
    return (
      <NoteEditor
        at={editor.at}
        draft={editor.draft}
        viewer={ann.noteAuthor}
        onSave={ann.saveNote}
        onAppend={ann.appendMessage}
        onRemove={ann.removeNote}
        onClose={close}
      />
    )
  }
  if (editor.kind === 'goal') {
    return (
      <GoalEditor
        at={editor.at}
        draft={editor.draft}
        onSave={ann.saveGoal}
        onRemove={ann.removeGoal}
        onClose={close}
      />
    )
  }
  return null
}
