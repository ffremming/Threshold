// Shared drag-and-drop event prop builders for the plan builder.
// Centralises the repeated preventDefault / dropEffect / target wiring so
// the calendar and list views stay consistent and free of copy-pasted logic.

function applyDropEffect(event, dragState) {
  if (!event.dataTransfer) return
  event.dataTransfer.dropEffect = dragState.kind === 'template' ? 'copy' : 'move'
}

// Drop props for a container that accepts a workout/template at a weekday,
// optionally before a specific workout.
export function makeDropZoneProps({ dragState, handleDropTargetChange, handleDrop, weekday, beforeWorkoutId = null, stopPropagation = false }) {
  return {
    onDragOver(event) {
      if (!dragState) return
      event.preventDefault()
      if (stopPropagation) event.stopPropagation()
      applyDropEffect(event, dragState)
      handleDropTargetChange(weekday, beforeWorkoutId)
    },
    async onDrop(event) {
      event.preventDefault()
      if (stopPropagation) event.stopPropagation()
      await handleDrop(weekday, beforeWorkoutId)
    },
  }
}
