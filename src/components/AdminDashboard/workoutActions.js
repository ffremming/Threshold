import {
  addDoc, collection, deleteDoc, deleteField, doc, serverTimestamp, updateDoc,
} from 'firebase/firestore'
import { db } from '../../firebase'
import {
  getDateStringForWeekday,
  getDefaultCooldown,
  getDefaultWarmup,
  normalizeIntensityZones,
  normalizeLoadTag,
} from '../../utils'

export function createWorkoutCrud(ctx) {
  const {
    selectedAthleteId, currentWeek, currentYear,
    workouts, selectedWorkout, setSelectedWorkout,
  } = ctx

  async function addWorkoutToWeek(fields) {
    if (!selectedAthleteId) return
    const nextOrder = workouts.length > 0 ? Math.max(...workouts.map(w => w.order ?? 0)) + 1 : 1
    const weekday = Number(fields.weekday)
    const intensityZone = normalizeIntensityZones(fields.type, fields.intensityZone)
    await addDoc(collection(db, 'workouts'), {
      ...fields,
      intensityZone,
      loadTag: normalizeLoadTag(fields.type, intensityZone, fields.loadTag),
      warmup: fields.warmup?.trim() || getDefaultWarmup(fields.type, fields.activityTag),
      cooldown: fields.cooldown?.trim() || getDefaultCooldown(fields.type, fields.activityTag),
      athleteId: selectedAthleteId,
      week: currentWeek,
      year: currentYear,
      weekday,
      date: getDateStringForWeekday(currentWeek, currentYear, weekday),
      order: nextOrder,
      completed: false,
      createdAt: serverTimestamp(),
    })
  }

  async function handleEditWorkout(updated) {
    const { id, ...fields } = updated
    const intensityZone = normalizeIntensityZones(fields.type, fields.intensityZone)
    await updateDoc(doc(db, 'workouts', id), {
      ...fields,
      weekday: Number(fields.weekday),
      date: getDateStringForWeekday(updated.week, updated.year, fields.weekday),
      intensityZone,
      loadTag: normalizeLoadTag(fields.type, intensityZone, fields.loadTag),
      warmup: fields.warmup?.trim() || getDefaultWarmup(fields.type, fields.activityTag),
      cooldown: fields.cooldown?.trim() || getDefaultCooldown(fields.type, fields.activityTag),
    })
    setSelectedWorkout(null)
  }

  async function handleDeleteWorkout(workout) {
    if (!window.confirm(`Delete "${workout.title}"?`)) return
    await deleteDoc(doc(db, 'workouts', workout.id))
    setSelectedWorkout(null)
  }

  async function handleToggleComplete(workout) {
    await updateDoc(doc(db, 'workouts', workout.id), {
      completed: !workout.completed,
      completedAt: !workout.completed ? serverTimestamp() : null,
    })
    if (selectedWorkout?.id === workout.id) {
      setSelectedWorkout(prev => ({ ...prev, completed: !prev.completed }))
    }
  }

  async function handleSaveComment(workout, payload) {
    const userComment = typeof payload === 'string' ? payload : payload.userComment
    await updateDoc(doc(db, 'workouts', workout.id), {
      userComment,
      formScore: deleteField(),
      surplusScore: deleteField(),
      userCommentUpdatedAt: serverTimestamp(),
    })
    if (selectedWorkout?.id === workout.id) {
      setSelectedWorkout(prev => ({
        ...prev,
        userComment,
        formScore: null,
        surplusScore: null,
      }))
    }
  }

  return { addWorkoutToWeek, handleEditWorkout, handleDeleteWorkout, handleToggleComplete, handleSaveComment }
}
