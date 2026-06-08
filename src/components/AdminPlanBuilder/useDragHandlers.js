import { useState } from 'react'
import { setSessionDragImage, setSessionsDragImage } from './dragImage'

// Drag state machine shared by the Week view (single-week) and the Month view
// (multi-week). Drop targets carry an optional { week, year }; when omitted the
// caller defaults to the selected week, so the Week-view call sites are
// unchanged. Cross-week placement is routed to the *Across handlers.
export function useDragHandlers({
  currentWeek,
  currentYear,
  workouts,
  overviewWorkouts,
  onAddTemplateToDay,
  onAddTemplateToDayAcross,
  onMoveWorkoutByDrag,
  onMoveWorkoutAcross,
  onMoveMany,
  onDeleteWorkout,
}) {
  const [dragState, setDragState] = useState(null)
  const [dropTarget, setDropTarget] = useState(null)

  const pool = () => (overviewWorkouts && overviewWorkouts.length ? overviewWorkouts : workouts)

  function sessionsOnDay(week, year, weekday) {
    return pool().filter(w => Number(w.week) === Number(week)
      && Number(w.year) === Number(year)
      && Number(w.weekday) === Number(weekday))
  }

  function handleTemplateDragStart(template, event) {
    if (event?.dataTransfer) {
      event.dataTransfer.effectAllowed = 'copy'
      try { event.dataTransfer.setData('text/plain', `template:${template.id || ''}`) } catch {}
      setSessionDragImage(event, template)
    }
    setDragState({ kind: 'template', template })
    setDropTarget(null)
  }

  function handleWorkoutDragStart(workout, event) {
    if (event?.dataTransfer) {
      event.dataTransfer.effectAllowed = 'move'
      try { event.dataTransfer.setData('text/plain', `workout:${workout.id}`) } catch {}
      setSessionDragImage(event, workout)
    }
    setDragState({ kind: 'workout', workoutId: workout.id })
    setDropTarget({
      week: workout.week,
      year: workout.year,
      weekday: workout.weekday,
      beforeWorkoutId: workout.id,
    })
  }

  // Drag an entire day: moves every session on (week, year, weekday) to the
  // dropped-on day at once. No-op if the day is empty.
  function handleDayDragStart(week, year, weekday, event) {
    const sessions = sessionsOnDay(week, year, weekday)
    if (sessions.length === 0) {
      event?.preventDefault?.()
      return
    }
    if (event?.dataTransfer) {
      event.dataTransfer.effectAllowed = 'move'
      try { event.dataTransfer.setData('text/plain', `day:${year}-${week}-${weekday}`) } catch {}
      setSessionsDragImage(event, sessions)
    }
    setDragState({ kind: 'day', week, year, weekday })
    setDropTarget(null)
  }

  function handleDragEnd() {
    setDragState(null)
    setDropTarget(null)
  }

  function handleDropTargetChange(weekday, beforeWorkoutId = null, week, year) {
    if (!dragState) return
    // Only update when the target actually changes. dragover fires continuously;
    // setting state every time floods re-renders and churns the drop-zone DOM,
    // which can make the browser drop the drop (especially in the month grid).
    setDropTarget(prev => {
      if (prev
        && prev.weekday === weekday
        && prev.beforeWorkoutId === beforeWorkoutId
        && prev.week === week
        && prev.year === year) {
        return prev
      }
      return { week, year, weekday, beforeWorkoutId }
    })
  }

  async function handleDrop(weekday, beforeWorkoutId = null, week, year) {
    if (!dragState) return

    const activeDrag = dragState
    setDragState(null)
    setDropTarget(null)

    const targetWeek = week ?? currentWeek
    const targetYear = year ?? currentYear
    const crossWeek = week != null || year != null

    if (activeDrag.kind === 'day') {
      const sameDay = Number(activeDrag.week) === Number(targetWeek)
        && Number(activeDrag.year) === Number(targetYear)
        && Number(activeDrag.weekday) === Number(weekday)
      if (sameDay || !onMoveMany) return
      const moves = sessionsOnDay(activeDrag.week, activeDrag.year, activeDrag.weekday)
        .map(w => ({ id: w.id, week: targetWeek, year: targetYear, weekday }))
      if (moves.length > 0) await onMoveMany(moves)
      return
    }

    if (activeDrag.kind === 'template') {
      if (crossWeek && onAddTemplateToDayAcross) {
        await onAddTemplateToDayAcross(activeDrag.template, targetWeek, targetYear, weekday, beforeWorkoutId)
      } else {
        await onAddTemplateToDay(activeDrag.template, weekday, beforeWorkoutId)
      }
      return
    }

    if (crossWeek && onMoveWorkoutAcross) {
      await onMoveWorkoutAcross(activeDrag.workoutId, targetWeek, targetYear, weekday, beforeWorkoutId)
    } else {
      await onMoveWorkoutByDrag(activeDrag.workoutId, weekday, beforeWorkoutId)
    }
  }

  async function handleTrashDrop() {
    if (!dragState) return

    const activeDrag = dragState
    setDragState(null)
    setDropTarget(null)

    if (activeDrag.kind !== 'workout') return

    const pool = overviewWorkouts && overviewWorkouts.length ? overviewWorkouts : workouts
    const draggedWorkout = pool.find(workout => workout.id === activeDrag.workoutId)
    if (!draggedWorkout) return

    await onDeleteWorkout(draggedWorkout)
  }

  return {
    dragState,
    dropTarget,
    handleTemplateDragStart,
    handleWorkoutDragStart,
    handleDayDragStart,
    handleDragEnd,
    handleDropTargetChange,
    handleDrop,
    handleTrashDrop,
  }
}
