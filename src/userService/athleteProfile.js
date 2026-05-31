// Coaching profile for athletes: max HR, training zones and logged results.
import { doc, updateDoc, arrayUnion, arrayRemove, serverTimestamp } from 'firebase/firestore'
import { db } from '../firebase'
import { withDatabaseWriteLimit } from '../security/rateLimits'

function numberOrNull(value) {
  const n = Number(value)
  return Number.isFinite(n) && n > 0 ? n : null
}

function trimmedOrNull(value) {
  if (typeof value === 'string') return value.trim() || null
  return value ?? null
}

export async function updateAthleteMaxHr(uid, maxHr) {
  await withDatabaseWriteLimit('users', () => updateDoc(doc(db, 'users', uid), {
    maxHr: numberOrNull(maxHr),
    updatedAt: serverTimestamp(),
  }))
}

export async function updateAthleteZones(uid, { thresholdHr, vo2maxHr, easyTempo, longTempo }) {
  await withDatabaseWriteLimit('users', () => updateDoc(doc(db, 'users', uid), {
    thresholdHr: numberOrNull(thresholdHr),
    vo2maxHr: numberOrNull(vo2maxHr),
    easyTempo: trimmedOrNull(easyTempo),
    longTempo: trimmedOrNull(longTempo),
    updatedAt: serverTimestamp(),
  }))
}

export async function addAthleteResult(uid, { date, distance, time, note }) {
  // createdAt is an ISO string (not serverTimestamp) because Firestore
  // does not allow sentinel values inside arrayUnion payloads.
  const entry = {
    date: date || new Date().toISOString().slice(0, 10),
    distance: typeof distance === 'string' ? distance.trim() : String(distance ?? ''),
    time: typeof time === 'string' ? time.trim() : String(time ?? ''),
    note: typeof note === 'string' ? note.trim() : '',
    createdAt: new Date().toISOString(),
  }
  await withDatabaseWriteLimit('users', () => updateDoc(doc(db, 'users', uid), {
    results: arrayUnion(entry),
    updatedAt: serverTimestamp(),
  }))
  return entry
}

export async function removeAthleteResult(uid, entry) {
  await withDatabaseWriteLimit('users', () => updateDoc(doc(db, 'users', uid), {
    results: arrayRemove(entry),
    updatedAt: serverTimestamp(),
  }))
}
