import {
  collection, doc, serverTimestamp, updateDoc, writeBatch,
} from 'firebase/firestore'
import { db } from '../../firebase'
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
    workouts, selectedWorkout, setSelectedWorkout,
    replacementTarget, setReplacementTarget,
    customForm, setCustomForm, setShowCustomForm,
    setPickingFromBank, setTab, addWorkoutToWeek,
  } = ctx

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
        `Er du sikker på at du vil bytte ut økten "${replacementTarget.title}" med "${template.title}"?`
      )
      if (!shouldReplace) return

      await updateDoc(doc(db, 'workouts', replacementTarget.id), {
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
      })

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

  async function handleAddTemplateToDay(template, weekday, beforeWorkoutId = null) {
    if (!selectedAthleteId) return

    const normalizedWeekday = Number(weekday)
    const targetDayWorkouts = workouts
      .filter(workout => workout.weekday === normalizedWeekday)
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
      week: currentWeek,
      year: currentYear,
      weekday: normalizedWeekday,
      date: getDateStringForWeekday(currentWeek, currentYear, normalizedWeekday),
      time: fields.time || '',
      completed: false,
      completedAt: null,
      userComment: '',
      userCommentUpdatedAt: null,
      createdAt: serverTimestamp(),
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
        batch.set(newWorkoutRef, { order: index + 1 }, { merge: true })
        return
      }
      batch.update(doc(db, 'workouts', workout.id), { order: index + 1 })
    })

    await batch.commit()
  }

  return { handleAddCustom, handleAddFromTemplate, handleAddTemplateToDay }
}
