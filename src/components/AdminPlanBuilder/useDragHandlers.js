import { useState } from 'react'

export function useDragHandlers({ workouts, onAddTemplateToDay, onMoveWorkoutByDrag, onDeleteWorkout }) {
  const [dragState, setDragState] = useState(null)
  const [dropTarget, setDropTarget] = useState(null)

  function handleTemplateDragStart(template, event) {
    if (event?.dataTransfer) {
      event.dataTransfer.effectAllowed = 'copy'
      try { event.dataTransfer.setData('text/plain', `template:${template.id || ''}`) } catch {}
    }
    setDragState({ kind: 'template', template })
    setDropTarget(null)
  }

  function handleWorkoutDragStart(workout, event) {
    if (event?.dataTransfer) {
      event.dataTransfer.effectAllowed = 'move'
      try { event.dataTransfer.setData('text/plain', `workout:${workout.id}`) } catch {}
    }
    setDragState({ kind: 'workout', workoutId: workout.id })
    setDropTarget({
      weekday: workout.weekday,
      beforeWorkoutId: workout.id,
    })
  }

  function handleDragEnd() {
    setDragState(null)
    setDropTarget(null)
  }

  function handleDropTargetChange(weekday, beforeWorkoutId = null) {
    if (!dragState) return
    setDropTarget({ weekday, beforeWorkoutId })
  }

  async function handleDrop(weekday, beforeWorkoutId = null) {
    if (!dragState) return

    const activeDrag = dragState
    setDragState(null)
    setDropTarget(null)

    if (activeDrag.kind === 'template') {
      await onAddTemplateToDay(activeDrag.template, weekday, beforeWorkoutId)
      return
    }

    await onMoveWorkoutByDrag(activeDrag.workoutId, weekday, beforeWorkoutId)
  }

  async function handleTrashDrop() {
    if (!dragState) return

    const activeDrag = dragState
    setDragState(null)
    setDropTarget(null)

    if (activeDrag.kind !== 'workout') return

    const draggedWorkout = workouts.find(workout => workout.id === activeDrag.workoutId)
    if (!draggedWorkout) return

    await onDeleteWorkout(draggedWorkout)
  }

  return {
    dragState,
    dropTarget,
    handleTemplateDragStart,
    handleWorkoutDragStart,
    handleDragEnd,
    handleDropTargetChange,
    handleDrop,
    handleTrashDrop,
  }
}
