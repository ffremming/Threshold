import { signOut } from 'firebase/auth'
import { auth } from '../../firebase'
import { isRateLimitError } from '../../security/rateLimits'
import { createWorkoutCrud } from './workoutActions'
import { createTemplateInsertActions } from './templateInsertActions'
import { createMoveActions, createDragHandlers } from './dragDrop'
import { createTemplateActions, createGlobalTemplateActions } from './templateActions'

function reportActionError(error) {
  console.error('Admin action failed', error)
  window.alert(isRateLimitError(error) ? error.message : 'Could not save the change. Please try again.')
}

function wrapAction(action) {
  if (typeof action !== 'function') return action

  return (...args) => {
    try {
      const result = action(...args)
      if (result && typeof result.catch === 'function') {
        return result.catch(reportActionError)
      }
      return result
    } catch (error) {
      reportActionError(error)
      return undefined
    }
  }
}

export function useAdminActions(state) {
  const {
    selectedAthleteId, currentWeek, currentYear, workouts, overviewWorkouts, isSuperadmin, userProfile, templates,
    selectedWorkout, setSelectedWorkout,
    replacementTarget, setReplacementTarget,
    customForm, setCustomForm, setShowCustomForm,
    setPickingFromBank, setTab,
    draggedWorkoutId, setDraggedWorkoutId, setDropTarget,
    templateForm, setTemplateForm, editingTemplate, setEditingTemplate,
    globalTemplateForm, setGlobalTemplateForm, editingGlobalTemplate, setEditingGlobalTemplate,
    pushUndo,
    onClose,
  } = state

  const crud = createWorkoutCrud({
    selectedAthleteId, currentWeek, currentYear, workouts, selectedWorkout, setSelectedWorkout,
    pushUndo,
  })

  const inserts = createTemplateInsertActions({
    selectedAthleteId, currentWeek, currentYear, workouts, overviewWorkouts, selectedWorkout, setSelectedWorkout,
    replacementTarget, setReplacementTarget, customForm, setCustomForm, setShowCustomForm,
    setPickingFromBank, setTab, addWorkoutToWeek: crud.addWorkoutToWeek,
    pushUndo,
  })

  const moves = createMoveActions({ workouts, overviewWorkouts, currentWeek, currentYear, pushUndo })
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

  const actions = {
    ...crud, ...inserts, ...moves, ...drag, ...templateActs, ...globalActs,
    handleStartReplaceWorkout, handleLogout,
  }

  return Object.fromEntries(
    Object.entries(actions).map(([key, action]) => [key, wrapAction(action)])
  )
}
