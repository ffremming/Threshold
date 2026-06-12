import {
  addDoc, collection, deleteDoc, deleteField, doc, serverTimestamp, updateDoc,
} from 'firebase/firestore'
import { db } from '../../firebase'
import { withDatabaseWriteLimit } from '../../security/rateLimits'
import {
  getDateStringForWeekday,
  normalizeIntensityZones,
  normalizeLoadTag,
} from '../../utils'

export function createWorkoutCrud(ctx) {
  const {
    selectedAthleteId, currentWeek, currentYear,
    workouts, selectedWorkout, setSelectedWorkout,
    pushUndo,
  } = ctx

  async function addWorkoutToWeek(fields) {
    if (!selectedAthleteId) return
    const nextOrder = workouts.length > 0 ? Math.max(...workouts.map(w => w.order ?? 0)) + 1 : 1
    const weekday = Number(fields.weekday)
    const intensityZone = normalizeIntensityZones(fields.type, fields.intensityZone)
    const ref = await withDatabaseWriteLimit('workouts', () => addDoc(collection(db, 'workouts'), {
      ...fields,
      intensityZone,
      loadTag: normalizeLoadTag(fields.type, intensityZone, fields.loadTag),
      athleteId: selectedAthleteId,
      week: currentWeek,
      year: currentYear,
      weekday,
      date: getDateStringForWeekday(currentWeek, currentYear, weekday),
      order: nextOrder,
      completed: false,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    }))
    // Undo a custom add by deleting the doc it created.
    if (ref?.id) {
      pushUndo?.(() => withDatabaseWriteLimit('workouts', () => deleteDoc(doc(db, 'workouts', ref.id))))
    }
    return ref?.id || null
  }

  async function handleEditWorkout(updated) {
    const { id, ...fields } = updated
    const intensityZone = normalizeIntensityZones(fields.type, fields.intensityZone)
    await withDatabaseWriteLimit('workouts', () => updateDoc(doc(db, 'workouts', id), {
      ...fields,
      weekday: Number(fields.weekday),
      date: getDateStringForWeekday(updated.week, updated.year, fields.weekday),
      intensityZone,
      loadTag: normalizeLoadTag(fields.type, intensityZone, fields.loadTag),
      updatedAt: serverTimestamp(),
    }))
    setSelectedWorkout(null)
  }

  async function handleDeleteWorkout(workout) {
    // Capture before deleting so undo can recreate it (with a new id, which is
    // fine — nothing external keys off a workout id).
    const { id, ...snapshot } = workout
    await withDatabaseWriteLimit('workouts', () => deleteDoc(doc(db, 'workouts', workout.id)))
    setSelectedWorkout(null)
    pushUndo?.(() => withDatabaseWriteLimit('workouts', () => addDoc(collection(db, 'workouts'), {
      ...snapshot,
      athleteId: snapshot.athleteId || selectedAthleteId,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    })))
  }

  async function handleToggleComplete(workout) {
    await withDatabaseWriteLimit('workouts', () => updateDoc(doc(db, 'workouts', workout.id), {
      completed: !workout.completed,
      completedAt: !workout.completed ? serverTimestamp() : null,
      updatedAt: serverTimestamp(),
    }))
    if (selectedWorkout?.id === workout.id) {
      setSelectedWorkout(prev => ({ ...prev, completed: !prev.completed }))
    }
  }

  async function handleSaveComment(workout, payload) {
    const userComment = typeof payload === 'string' ? payload : payload.userComment
    await withDatabaseWriteLimit('workouts', () => updateDoc(doc(db, 'workouts', workout.id), {
      userComment,
      formScore: deleteField(),
      surplusScore: deleteField(),
      userCommentUpdatedAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    }))
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
