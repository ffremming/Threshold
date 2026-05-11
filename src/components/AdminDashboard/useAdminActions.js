import { signOut } from 'firebase/auth'
import { auth } from '../../firebase'
import { createWorkoutCrud } from './workoutActions'
import { createTemplateInsertActions } from './templateInsertActions'
import { createMoveActions, createDragHandlers } from './dragDrop'
import { createTemplateActions, createGlobalTemplateActions } from './templateActions'

export function useAdminActions(state) {
  const {
    selectedAthleteId, currentWeek, currentYear, workouts, isSuperadmin, userProfile, templates,
    selectedWorkout, setSelectedWorkout,
    replacementTarget, setReplacementTarget,
    customForm, setCustomForm, setShowCustomForm,
    setPickingFromBank, setTab,
    draggedWorkoutId, setDraggedWorkoutId, setDropTarget,
    templateForm, setTemplateForm, editingTemplate, setEditingTemplate,
    globalTemplateForm, setGlobalTemplateForm, editingGlobalTemplate, setEditingGlobalTemplate,
    onClose,
  } = state

  const crud = createWorkoutCrud({
    selectedAthleteId, currentWeek, currentYear, workouts, selectedWorkout, setSelectedWorkout,
  })

  const inserts = createTemplateInsertActions({
    selectedAthleteId, currentWeek, currentYear, workouts, selectedWorkout, setSelectedWorkout,
    replacementTarget, setReplacementTarget, customForm, setCustomForm, setShowCustomForm,
    setPickingFromBank, setTab, addWorkoutToWeek: crud.addWorkoutToWeek,
  })

  const moves = createMoveActions({ workouts, currentWeek, currentYear })
  const drag = createDragHandlers({
    draggedWorkoutId, setDraggedWorkoutId, setDropTarget, moveWorkoutByDrag: moves.moveWorkoutByDrag,
  })

  const templateActs = createTemplateActions({
    userProfile, templates, templateForm, setTemplateForm, editingTemplate, setEditingTemplate,
  })

  const globalActs = createGlobalTemplateActions({
    isSuperadmin, globalTemplateForm, setGlobalTemplateForm, editingGlobalTemplate, setEditingGlobalTemplate,
  })

  function handleStartReplaceWorkout(workout) {
    setReplacementTarget(workout)
    setPickingFromBank(true)
    setTab('oktbank')
  }

  async function handleLogout() {
    await signOut(auth)
    onClose()
  }

  return {
    ...crud, ...inserts, ...moves, ...drag, ...templateActs, ...globalActs,
    handleStartReplaceWorkout, handleLogout,
  }
}
