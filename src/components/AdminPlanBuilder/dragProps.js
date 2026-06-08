// Shared drag-and-drop event prop builders for the plan builder.
// Centralises the repeated preventDefault / dropEffect / target wiring so
// the week and month views stay consistent and free of copy-pasted logic.

function applyDropEffect(event, dragState) {
  if (!event.dataTransfer) return
  event.dataTransfer.dropEffect = dragState.kind === 'template' ? 'copy' : 'move'
}

// Drop props for a container that accepts a workout/template at a weekday,
// optionally in a specific (week, year) and before a specific workout.
export function makeDropZoneProps({
  dragState, handleDropTargetChange, handleDrop,
  weekday, beforeWorkoutId = null, week, year, stopPropagation = false,
}) {
  return {
    onDragOver(event) {
      if (!dragState) return
      event.preventDefault()
      if (stopPropagation) event.stopPropagation()
      applyDropEffect(event, dragState)
      handleDropTargetChange(weekday, beforeWorkoutId, week, year)
    },
    async onDrop(event) {
      event.preventDefault()
      if (stopPropagation) event.stopPropagation()
      await handleDrop(weekday, beforeWorkoutId, week, year)
    },
  }
}
