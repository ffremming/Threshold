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
        const ok = window.confirm(`Slette økten "${w.title || 'uten tittel'}"? Dette kan ikke angres.`)
        if (!ok) return
        try {
          await deleteDoc(doc(db, 'workouts', w.id))
          setSelectedWorkout(null)
        } catch (err) {
          console.error('Kunne ikke slette økten', err)
          window.alert('Kunne ikke slette økten. Prøv igjen.')
        }
      } : undefined}
      onToggleComplete={handleToggleComplete}
      onSaveComment={handleSaveComment}
      onEdit={canManageWorkouts ? async (updated) => {
        const { id, ...fields } = updated
        const intensityZone = normalizeIntensityZones(fields.type, fields.intensityZone)
        try {
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
        } catch (err) {
          console.error('Kunne ikke lagre endringen', err)
          window.alert('Kunne ikke lagre endringen. Prøv igjen.')
        }
      } : undefined}
    />
  )
}
