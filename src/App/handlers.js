import { signOut } from 'firebase/auth'
import {
  addDoc, collection, updateDoc, doc, serverTimestamp, deleteField,
} from 'firebase/firestore'
import { db, auth } from '../firebase'
import {
  getAdjacentWeek,
  getDateStringForWeekday,
  getDefaultCooldown,
  getDefaultWarmup,
  normalizeLoadTag,
  normalizeIntensityZones,
  normalizeWeekday,
} from '../utils'
import { updateUserProfile } from '../userService'

export function createHandlers({
  selectedWorkout,
  setSelectedWorkout,
  replacementTarget,
  setReplacementTarget,
  setShowAdmin,
  setShowUserManagement,
  setShowAthleteOverview,
  selectedAthleteId,
  userProfile,
  adminWorkoutLayout,
}) {
  async function handleLogout() {
    await signOut(auth)
    setShowAdmin(false)
    setShowUserManagement(false)
    setShowAthleteOverview(false)
    setSelectedWorkout(null)
    setReplacementTarget(null)
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

  function handleStartReplaceWorkout(workout) {
    setReplacementTarget(workout)
    setSelectedWorkout(null)
  }

  async function handleReplaceWithTemplate(template) {
    if (!replacementTarget) return

    const shouldReplace = window.confirm(
      `Er du sikker på at du vil bytte ut økten "${replacementTarget.title}" med "${template.title}"?`
    )
    if (!shouldReplace) return

    const { id, createdAt, updatedAt, templateId, source, ...fields } = template
    const intensityZone = normalizeIntensityZones(fields.type, fields.intensityZone)
    await updateDoc(doc(db, 'workouts', replacementTarget.id), {
      ...fields,
      intensityZone,
      loadTag: normalizeLoadTag(fields.type, intensityZone, fields.loadTag),
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
    })

    setReplacementTarget(null)
  }

  async function handleDuplicateWorkout(workout) {
    if (!workout) return
    const currentWeekday = normalizeWeekday(workout.weekday)
    let targetWeekday = currentWeekday + 1
    let targetWeek = workout.week
    let targetYear = workout.year
    if (currentWeekday === 7) {
      const next = getAdjacentWeek(workout.week, workout.year, 1)
      targetWeek = next.week
      targetYear = next.year
      targetWeekday = 1
    }

    const {
      id, createdAt, updatedAt, completed, completedAt,
      userComment, userCommentUpdatedAt, formScore, surplusScore,
      ...fields
    } = workout

    await addDoc(collection(db, 'workouts'), {
      ...fields,
      week: targetWeek,
      year: targetYear,
      weekday: targetWeekday,
      date: getDateStringForWeekday(targetWeek, targetYear, targetWeekday),
      completed: false,
      completedAt: null,
      userComment: '',
      userCommentUpdatedAt: null,
      createdAt: serverTimestamp(),
    })

    setSelectedWorkout(null)
  }

  function closeTemplatePicker() {
    setReplacementTarget(null)
  }

  async function handleWorkoutLayoutChange(nextLayout) {
    const targetUserId = selectedAthleteId || userProfile?.uid
    if (!targetUserId || nextLayout === adminWorkoutLayout) return
    await updateUserProfile(targetUserId, { workoutLayout: nextLayout })
  }

  return {
    handleLogout,
    handleToggleComplete,
    handleSaveComment,
    handleStartReplaceWorkout,
    handleReplaceWithTemplate,
    handleDuplicateWorkout,
    closeTemplatePicker,
    handleWorkoutLayoutChange,
  }
}
