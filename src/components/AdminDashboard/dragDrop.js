import { addDoc, collection, deleteDoc, doc, serverTimestamp, writeBatch } from 'firebase/firestore'
import { db } from '../../firebase'
import { withDatabaseWriteLimit } from '../../security/rateLimits'
import {
  compareWorkoutsBySchedule,
  getDateStringForWeekday,
} from '../../utils'

// True when two workouts sit in the same (week, year, weekday) bucket.
function sameDay(a, b) {
  return Number(a.week) === Number(b.week)
    && Number(a.year) === Number(b.year)
    && Number(a.weekday) === Number(b.weekday)
}

export function createMoveActions(ctx) {
  const { workouts, currentWeek, currentYear, overviewWorkouts, pushUndo } = ctx

  // Register an undo that writes the captured prior positions back, in one batch.
  // `priors` = [{ id, week, year, weekday, date, order }].
  function registerRestoreUndo(priors) {
    if (!priors?.length || !pushUndo) return
    pushUndo(() => withDatabaseWriteLimit('workouts', () => {
      const batch = writeBatch(db)
      priors.forEach(p => batch.update(doc(db, 'workouts', p.id), {
        week: p.week, year: p.year, weekday: p.weekday, date: p.date, order: p.order,
        updatedAt: serverTimestamp(),
      }))
      return batch.commit()
    }))
  }

  // The pool the move logic reasons over. In the week view this is just the
  // loaded week; in the month view it spans the whole overview window so a
  // session can move across week boundaries. Falls back to `workouts`.
  const pool = overviewWorkouts && overviewWorkouts.length ? overviewWorkouts : workouts

  function dayWorkouts(week, year, weekday, excludeId = null) {
    return pool
      .filter(w => Number(w.week) === Number(week)
        && Number(w.year) === Number(year)
        && Number(w.weekday) === Number(weekday)
        && w.id !== excludeId)
      .sort(compareWorkoutsBySchedule)
  }

  async function moveWorkout(workout, direction) {
    const sorted = dayWorkouts(workout.week, workout.year, workout.weekday)
    const idx = sorted.findIndex(w => w.id === workout.id)
    const swapIdx = idx + direction
    if (swapIdx < 0 || swapIdx >= sorted.length) return
    const batch = writeBatch(db)
    batch.update(doc(db, 'workouts', sorted[idx].id), {
      order: sorted[swapIdx].order ?? swapIdx + 1,
      updatedAt: serverTimestamp(),
    })
    batch.update(doc(db, 'workouts', sorted[swapIdx].id), {
      order: sorted[idx].order ?? idx + 1,
      updatedAt: serverTimestamp(),
    })
    await withDatabaseWriteLimit('workouts', () => batch.commit())
  }

  // Week-aware move. Places the dragged workout into (targetWeek, targetYear,
  // targetWeekday) before `beforeWorkoutId`, re-ordering the target day and, if
  // it moved out of a different day, the source day too.
  async function moveWorkoutAcross(workoutId, targetWeek, targetYear, targetWeekday, beforeWorkoutId = null) {
    const draggedWorkout = pool.find(workout => workout.id === workoutId)
    if (!draggedWorkout || !targetWeekday || !targetWeek || !targetYear) return

    const tWeek = Number(targetWeek)
    const tYear = Number(targetYear)
    const tWeekday = Number(targetWeekday)
    const targetDate = getDateStringForWeekday(tWeek, tYear, tWeekday)

    const isSameDay = sameDay(draggedWorkout, { week: tWeek, year: tYear, weekday: tWeekday })

    const sourceDayWorkouts = dayWorkouts(
      draggedWorkout.week, draggedWorkout.year, draggedWorkout.weekday, draggedWorkout.id,
    )
    const targetDayWorkouts = dayWorkouts(tWeek, tYear, tWeekday, draggedWorkout.id)

    let insertIndex = targetDayWorkouts.length
    if (beforeWorkoutId) {
      const candidateIndex = targetDayWorkouts.findIndex(workout => workout.id === beforeWorkoutId)
      if (candidateIndex >= 0) insertIndex = candidateIndex
    }

    const nextTargetDayWorkouts = [...targetDayWorkouts]
    nextTargetDayWorkouts.splice(insertIndex, 0, {
      ...draggedWorkout,
      week: tWeek,
      year: tYear,
      weekday: tWeekday,
      date: targetDate,
    })

    // No-op guard: same day and unchanged order.
    const nextTargetIds = nextTargetDayWorkouts.map(workout => workout.id)
    const currentTargetIds = dayWorkouts(tWeek, tYear, tWeekday).map(workout => workout.id)
    if (isSameDay && nextTargetIds.join('|') === currentTargetIds.join('|')) {
      return
    }

    // Capture the dragged workout's prior position for undo.
    const prior = {
      id: draggedWorkout.id,
      week: Number(draggedWorkout.week),
      year: Number(draggedWorkout.year),
      weekday: Number(draggedWorkout.weekday),
      date: draggedWorkout.date || getDateStringForWeekday(
        draggedWorkout.week, draggedWorkout.year, draggedWorkout.weekday),
      order: draggedWorkout.order ?? 1,
    }

    const batch = writeBatch(db)

    nextTargetDayWorkouts.forEach((workout, index) => {
      batch.update(doc(db, 'workouts', workout.id), {
        week: tWeek,
        year: tYear,
        weekday: tWeekday,
        date: targetDate,
        order: index + 1,
        updatedAt: serverTimestamp(),
      })
    })

    if (!isSameDay) {
      sourceDayWorkouts.forEach((workout, index) => {
        batch.update(doc(db, 'workouts', workout.id), {
          order: index + 1,
          updatedAt: serverTimestamp(),
        })
      })
    }

    await withDatabaseWriteLimit('workouts', () => batch.commit())
    registerRestoreUndo([prior])
  }

  // Single-week wrapper kept for the existing week-view call sites.
  async function moveWorkoutByDrag(workoutId, targetWeekday, beforeWorkoutId = null) {
    await moveWorkoutAcross(workoutId, currentWeek, currentYear, targetWeekday, beforeWorkoutId)
  }

  // Batched multi-move for selection drag: relocate many workouts to new
  // (week, year, weekday) cells in a SINGLE commit, appending each to the end of
  // its destination day. `moves` = [{ id, week, year, weekday }].
  async function moveManyWorkouts(moves) {
    if (!moves?.length) return
    const batch = writeBatch(db)

    // Capture prior positions of every moved workout for undo.
    const byId = new Map(pool.map(w => [w.id, w]))
    const priors = moves.map(m => {
      const w = byId.get(m.id)
      if (!w) return null
      return {
        id: w.id,
        week: Number(w.week),
        year: Number(w.year),
        weekday: Number(w.weekday),
        date: w.date || getDateStringForWeekday(w.week, w.year, w.weekday),
        order: w.order ?? 1,
      }
    }).filter(Boolean)

    // Per-destination-day order counters, seeded from sessions that are NOT being
    // moved into/out of by this batch.
    const movingIds = new Set(moves.map(m => m.id))
    const dayCounts = new Map()
    const countKey = (w, y, wd) => `${y}-${w}-${wd}`
    const seedCount = (w, y, wd) => {
      const key = countKey(w, y, wd)
      if (!dayCounts.has(key)) {
        const existing = pool.filter(x => Number(x.week) === Number(w)
          && Number(x.year) === Number(y) && Number(x.weekday) === Number(wd)
          && !movingIds.has(x.id)).length
        dayCounts.set(key, existing)
      }
      return key
    }

    for (const { id, week, year, weekday } of moves) {
      const tWeek = Number(week)
      const tYear = Number(year)
      const wd = Number(weekday)
      const key = seedCount(tWeek, tYear, wd)
      const order = dayCounts.get(key) + 1
      dayCounts.set(key, order)
      batch.update(doc(db, 'workouts', id), {
        week: tWeek,
        year: tYear,
        weekday: wd,
        date: getDateStringForWeekday(tWeek, tYear, wd),
        order,
        updatedAt: serverTimestamp(),
      })
    }

    await withDatabaseWriteLimit('workouts', () => batch.commit())
    registerRestoreUndo(priors)
  }

  // Batched multi-delete for the month-view "Cut": remove many workouts in a
  // SINGLE commit. Captures each deleted workout's full snapshot so undo can
  // recreate them (with fresh ids — nothing external keys off a workout id).
  // `ids` = [workoutId].
  async function deleteManyWorkouts(ids) {
    if (!ids?.length) return
    const byId = new Map(pool.map(w => [w.id, w]))
    const snapshots = ids.map(id => byId.get(id)).filter(Boolean)
    if (!snapshots.length) return

    const batch = writeBatch(db)
    snapshots.forEach(w => batch.delete(doc(db, 'workouts', w.id)))
    await withDatabaseWriteLimit('workouts', () => batch.commit())

    if (pushUndo) {
      pushUndo(() => withDatabaseWriteLimit('workouts', async () => {
        for (const w of snapshots) {
          const { id, createdAt, updatedAt, ...snapshot } = w
          await addDoc(collection(db, 'workouts'), {
            ...snapshot,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          })
        }
      }))
    }
  }

  return { moveWorkout, moveWorkoutByDrag, moveWorkoutAcross, moveManyWorkouts, deleteManyWorkouts }
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
