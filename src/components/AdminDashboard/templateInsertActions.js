import {
  collection, doc, serverTimestamp, updateDoc, writeBatch,
} from 'firebase/firestore'
import { db } from '../../firebase'
import { withDatabaseWriteLimit } from '../../security/rateLimits'
import {
  compareWorkoutsBySchedule,
  getDateStringForWeekday,
  getDefaultCooldown,
  getDefaultWarmup,
  normalizeIntensityZones,
  normalizeLoadTag,
} from '../../utils'
import { EMPTY_TEMPLATE } from './constants'

export function createTemplateInsertActions(ctx) {
  const {
    selectedAthleteId, currentWeek, currentYear,
    workouts, overviewWorkouts, selectedWorkout, setSelectedWorkout,
    replacementTarget, setReplacementTarget,
    customForm, setCustomForm, setShowCustomForm,
    setPickingFromBank, setTab, addWorkoutToWeek,
    pushUndo,
  } = ctx

  // Register an undo that deletes the given created doc ids in one commit.
  function registerDeleteUndo(ids) {
    const list = ids.filter(Boolean)
    if (list.length === 0 || !pushUndo) return
    pushUndo(() => withDatabaseWriteLimit('workouts', () => {
      const batch = writeBatch(db)
      list.forEach(id => batch.delete(doc(db, 'workouts', id)))
      return batch.commit()
    }))
  }

  async function handleAddCustom(e) {
    e.preventDefault()
    await addWorkoutToWeek(customForm)
    setShowCustomForm(false)
    setCustomForm({ ...EMPTY_TEMPLATE })
  }

  async function handleAddFromTemplate(template) {
    const { id, createdAt, ...fields } = template
    if (replacementTarget) {
      const shouldReplace = window.confirm(
        `Are you sure you want to replace the session "${replacementTarget.title}" with "${template.title}"?`
      )
      if (!shouldReplace) return

      await withDatabaseWriteLimit('workouts', () => updateDoc(doc(db, 'workouts', replacementTarget.id), {
        ...EMPTY_TEMPLATE,
        ...fields,
        intensityZone: normalizeIntensityZones(fields.type, fields.intensityZone),
        loadTag: normalizeLoadTag(fields.type, fields.intensityZone, fields.loadTag),
        warmup: fields.warmup?.trim() || getDefaultWarmup(fields.type, fields.activityTag),
        cooldown: fields.cooldown?.trim() || getDefaultCooldown(fields.type, fields.activityTag),
        week: replacementTarget.week,
        year: replacementTarget.year,
        weekday: replacementTarget.weekday,
        date: replacementTarget.date,
        time: replacementTarget.time || '',
        order: replacementTarget.order ?? 0,
        completed: false,
        completedAt: null,
        userComment: '',
        userCommentUpdatedAt: null,
        updatedAt: serverTimestamp(),
      }))

      if (selectedWorkout?.id === replacementTarget.id) setSelectedWorkout(null)
      setReplacementTarget(null)
    } else {
      setCustomForm({
        ...EMPTY_TEMPLATE,
        ...fields,
        weekday: customForm.weekday || '',
        time: fields.time || '',
      })
      setShowCustomForm(true)
    }

    setPickingFromBank(false)
    setTab('plan')
  }

  // Week-aware template insertion. Adds a new workout from `template` into
  // (targetWeek, targetYear, weekday) before `beforeWorkoutId`, re-ordering that
  // day. Reasons over `pool` (overview window) so day ordering is correct even
  // when the target week is not the loaded one.
  async function addTemplateToDayAcross(template, targetWeek, targetYear, weekday, beforeWorkoutId = null) {
    if (!selectedAthleteId) return

    const tWeek = Number(targetWeek)
    const tYear = Number(targetYear)
    const normalizedWeekday = Number(weekday)
    const pool = overviewWorkouts && overviewWorkouts.length ? overviewWorkouts : workouts
    const targetDayWorkouts = pool
      .filter(workout => Number(workout.week) === tWeek
        && Number(workout.year) === tYear
        && Number(workout.weekday) === normalizedWeekday)
      .sort(compareWorkoutsBySchedule)

    let insertIndex = targetDayWorkouts.length
    if (beforeWorkoutId) {
      const candidateIndex = targetDayWorkouts.findIndex(workout => workout.id === beforeWorkoutId)
      if (candidateIndex >= 0) insertIndex = candidateIndex
    }

    const { id, createdAt, updatedAt, ownerId, source, ...fields } = template
    const batch = writeBatch(db)
    const newWorkoutRef = doc(collection(db, 'workouts'))

    batch.set(newWorkoutRef, {
      ...EMPTY_TEMPLATE,
      ...fields,
      intensityZone: normalizeIntensityZones(fields.type, fields.intensityZone),
      loadTag: normalizeLoadTag(fields.type, fields.intensityZone, fields.loadTag),
      warmup: fields.warmup?.trim() || getDefaultWarmup(fields.type, fields.activityTag),
      cooldown: fields.cooldown?.trim() || getDefaultCooldown(fields.type, fields.activityTag),
      athleteId: selectedAthleteId,
      week: tWeek,
      year: tYear,
      weekday: normalizedWeekday,
      date: getDateStringForWeekday(tWeek, tYear, normalizedWeekday),
      time: fields.time || '',
      completed: false,
      completedAt: null,
      userComment: '',
      userCommentUpdatedAt: null,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      order: insertIndex + 1,
    })

    const nextTargetDayWorkouts = [...targetDayWorkouts]
    nextTargetDayWorkouts.splice(insertIndex, 0, {
      id: newWorkoutRef.id,
      ...fields,
      weekday: normalizedWeekday,
    })

    nextTargetDayWorkouts.forEach((workout, index) => {
      if (workout.id === newWorkoutRef.id) {
        batch.set(newWorkoutRef, { order: index + 1, updatedAt: serverTimestamp() }, { merge: true })
        return
      }
      batch.update(doc(db, 'workouts', workout.id), { order: index + 1, updatedAt: serverTimestamp() })
    })

    await withDatabaseWriteLimit('workouts', () => batch.commit())
    registerDeleteUndo([newWorkoutRef.id])
  }

  // Single-week wrapper kept for the existing week-view call sites.
  async function handleAddTemplateToDay(template, weekday, beforeWorkoutId = null) {
    await addTemplateToDayAcross(template, currentWeek, currentYear, weekday, beforeWorkoutId)
  }

  // Batched multi-insert for paste: create many sessions across days/weeks in a
  // SINGLE Firestore commit (one rate-limited write), appending each to the end
  // of its target day. `items` = [{ session, week, year, weekday }].
  async function addManySessions(items) {
    if (!selectedAthleteId || !items?.length) return
    const pool = overviewWorkouts && overviewWorkouts.length ? overviewWorkouts : workouts
    const batch = writeBatch(db)
    const createdIds = []

    // Running per-day order counters, seeded from existing sessions in that day.
    const dayCounts = new Map()
    const countKey = (w, y, wd) => `${y}-${w}-${wd}`
    const seedCount = (w, y, wd) => {
      const key = countKey(w, y, wd)
      if (!dayCounts.has(key)) {
        const existing = pool.filter(x => Number(x.week) === Number(w)
          && Number(x.year) === Number(y) && Number(x.weekday) === Number(wd)).length
        dayCounts.set(key, existing)
      }
      return key
    }

    for (const { session, week, year, weekday } of items) {
      const tWeek = Number(week)
      const tYear = Number(year)
      const wd = Number(weekday)
      const key = seedCount(tWeek, tYear, wd)
      const order = dayCounts.get(key) + 1
      dayCounts.set(key, order)

      const { id, createdAt, updatedAt, ownerId, source, ...fields } = session
      const ref = doc(collection(db, 'workouts'))
      createdIds.push(ref.id)
      batch.set(ref, {
        ...EMPTY_TEMPLATE,
        ...fields,
        intensityZone: normalizeIntensityZones(fields.type, fields.intensityZone),
        loadTag: normalizeLoadTag(fields.type, fields.intensityZone, fields.loadTag),
        warmup: fields.warmup?.trim() || getDefaultWarmup(fields.type, fields.activityTag),
        cooldown: fields.cooldown?.trim() || getDefaultCooldown(fields.type, fields.activityTag),
        athleteId: selectedAthleteId,
        week: tWeek,
        year: tYear,
        weekday: wd,
        date: getDateStringForWeekday(tWeek, tYear, wd),
        time: fields.time || '',
        completed: false,
        completedAt: null,
        userComment: '',
        userCommentUpdatedAt: null,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        order,
      })
    }

    await withDatabaseWriteLimit('workouts', () => batch.commit())
    registerDeleteUndo(createdIds)
  }

  return {
    handleAddCustom, handleAddFromTemplate, handleAddTemplateToDay,
    addTemplateToDayAcross, addManySessions,
  }
}
