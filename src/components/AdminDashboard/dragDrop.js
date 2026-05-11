import { doc, writeBatch } from 'firebase/firestore'
import { db } from '../../firebase'
import {
  compareWorkoutsBySchedule,
  getDateStringForWeekday,
} from '../../utils'

export function createMoveActions(ctx) {
  const { workouts, currentWeek, currentYear } = ctx

  async function moveWorkout(workout, direction) {
    const sorted = workouts
      .filter(item => item.weekday === workout.weekday)
      .sort(compareWorkoutsBySchedule)
    const idx = sorted.findIndex(w => w.id === workout.id)
    const swapIdx = idx + direction
    if (swapIdx < 0 || swapIdx >= sorted.length) return
    const batch = writeBatch(db)
    batch.update(doc(db, 'workouts', sorted[idx].id), { order: sorted[swapIdx].order ?? swapIdx + 1 })
    batch.update(doc(db, 'workouts', sorted[swapIdx].id), { order: sorted[idx].order ?? idx + 1 })
    await batch.commit()
  }

  async function moveWorkoutByDrag(workoutId, targetWeekday, beforeWorkoutId = null) {
    const draggedWorkout = workouts.find(workout => workout.id === workoutId)
    if (!draggedWorkout || !targetWeekday) return

    const normalizedTargetWeekday = Number(targetWeekday)
    const sourceWeekday = Number(draggedWorkout.weekday)
    const sourceDayWorkouts = workouts
      .filter(workout => workout.weekday === sourceWeekday && workout.id !== draggedWorkout.id)
      .sort(compareWorkoutsBySchedule)
    const targetDayWorkouts = workouts
      .filter(workout => workout.weekday === normalizedTargetWeekday && workout.id !== draggedWorkout.id)
      .sort(compareWorkoutsBySchedule)

    let insertIndex = targetDayWorkouts.length
    if (beforeWorkoutId) {
      const candidateIndex = targetDayWorkouts.findIndex(workout => workout.id === beforeWorkoutId)
      if (candidateIndex >= 0) insertIndex = candidateIndex
    }

    const nextTargetDayWorkouts = [...targetDayWorkouts]
    nextTargetDayWorkouts.splice(insertIndex, 0, {
      ...draggedWorkout,
      weekday: normalizedTargetWeekday,
      date: getDateStringForWeekday(currentWeek, currentYear, normalizedTargetWeekday),
    })

    const nextTargetIds = nextTargetDayWorkouts.map(workout => workout.id)
    const currentTargetIds = workouts
      .filter(workout => workout.weekday === normalizedTargetWeekday)
      .sort(compareWorkoutsBySchedule)
      .map(workout => workout.id)

    if (
      sourceWeekday === normalizedTargetWeekday &&
      nextTargetIds.join('|') === currentTargetIds.join('|')
    ) {
      return
    }

    const batch = writeBatch(db)

    nextTargetDayWorkouts.forEach((workout, index) => {
      batch.update(doc(db, 'workouts', workout.id), {
        weekday: normalizedTargetWeekday,
        date: getDateStringForWeekday(currentWeek, currentYear, normalizedTargetWeekday),
        order: index + 1,
      })
    })

    if (sourceWeekday !== normalizedTargetWeekday) {
      sourceDayWorkouts.forEach((workout, index) => {
        batch.update(doc(db, 'workouts', workout.id), { order: index + 1 })
      })
    }

    await batch.commit()
  }

  return { moveWorkout, moveWorkoutByDrag }
}

export function createDragHandlers(ctx) {
  const { draggedWorkoutId, setDraggedWorkoutId, setDropTarget, moveWorkoutByDrag } = ctx

  function handleDragStart(workout) {
    setDraggedWorkoutId(workout.id)
    setDropTarget({ weekday: workout.weekday, beforeWorkoutId: workout.id })
  }

  function handleDragEnd() {
    setDraggedWorkoutId(null)
    setDropTarget(null)
  }

  function handleDropTargetChange(weekday, beforeWorkoutId = null) {
    if (!draggedWorkoutId) return
    setDropTarget(prev => {
      if (prev?.weekday === weekday && prev?.beforeWorkoutId === beforeWorkoutId) return prev
      return { weekday, beforeWorkoutId }
    })
  }

  async function handleDropWorkout(weekday, beforeWorkoutId = null) {
    if (!draggedWorkoutId) return
    const draggedId = draggedWorkoutId
    setDraggedWorkoutId(null)
    setDropTarget(null)
    await moveWorkoutByDrag(draggedId, weekday, beforeWorkoutId)
  }

  return { handleDragStart, handleDragEnd, handleDropTargetChange, handleDropWorkout }
}
