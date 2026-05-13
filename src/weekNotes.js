import { doc, onSnapshot, setDoc, serverTimestamp } from 'firebase/firestore'
import { db } from './firebase'
import { getWeekKey } from './utils'

const COLLECTION = 'weekNotes'

function buildDocId(athleteId, weekKey) {
  return `${athleteId}_${weekKey}`
}

export function subscribeWeekNote({ athleteId, week, year }, callback) {
  if (!athleteId || !week || !year) {
    callback(null)
    return () => {}
  }
  const weekKey = getWeekKey(week, year)
  const ref = doc(db, COLLECTION, buildDocId(athleteId, weekKey))
  return onSnapshot(
    ref,
    snap => {
      if (!snap.exists()) {
        callback({ athleteId, week, year, weekKey, text: '' })
        return
      }
      callback({ id: snap.id, ...snap.data() })
    },
    () => callback(null)
  )
}

export async function saveWeekNote({ athleteId, week, year, text }) {
  if (!athleteId || !week || !year) return
  const weekKey = getWeekKey(week, year)
  const ref = doc(db, COLLECTION, buildDocId(athleteId, weekKey))
  await setDoc(
    ref,
    {
      athleteId,
      week,
      year,
      weekKey,
      text: text ?? '',
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  )
}
