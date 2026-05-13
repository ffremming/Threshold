import { deleteDoc, updateDoc, doc } from 'firebase/firestore'
import { db } from '../firebase'
import {
  getDateStringForWeekday,
  getDefaultCooldown,
  getDefaultWarmup,
  normalizeLoadTag,
  normalizeIntensityZones,
} from '../utils'
import WorkoutDetail from '../components/WorkoutDetail'

export default function WorkoutDetailModal({
  selectedWorkout,
  setSelectedWorkout,
  canManageWorkouts,
  handleStartReplaceWorkout,
  handleDuplicateWorkout,
  handleToggleComplete,
  handleSaveComment,
}) {
  return (
    <WorkoutDetail
      workout={selectedWorkout}
      onClose={() => setSelectedWorkout(null)}
      canEdit={canManageWorkouts}
      onReplace={canManageWorkouts ? handleStartReplaceWorkout : undefined}
      onDuplicate={canManageWorkouts ? handleDuplicateWorkout : undefined}
      onDelete={canManageWorkouts ? async (w) => {
        await deleteDoc(doc(db, 'workouts', w.id))
        setSelectedWorkout(null)
      } : undefined}
      onToggleComplete={handleToggleComplete}
      onSaveComment={handleSaveComment}
      onEdit={canManageWorkouts ? async (updated) => {
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
      } : undefined}
    />
  )
}
