import {
  doc, setDoc, getDoc, getDocs, updateDoc, deleteDoc,
  collection, query, where, onSnapshot, serverTimestamp,
  arrayUnion, arrayRemove,
} from 'firebase/firestore'
import { db } from './firebase'
import { getPrimaryRole } from './roles'

function normalizeUserDoc(snapshot) {
  const data = snapshot.data()
  return {
    id: snapshot.id,
    uid: data.uid || snapshot.id,
    ...data,
  }
}

// ─── User Profiles ────────────────────────────────────────────────────────

export async function createUserProfile(uid, email, displayName, role = 'athlete') {
  const roles = Array.isArray(role) ? role : [role]
  await setDoc(doc(db, 'users', uid), {
    uid,
    email,
    displayName,
    workoutLayout: 'list',
    role: getPrimaryRole({ roles }),
    roles,
    createdAt: serverTimestamp(),
  })
}

export async function getUserProfile(uid) {
  const snap = await getDoc(doc(db, 'users', uid))
  return snap.exists() ? normalizeUserDoc(snap) : null
}

export function onUserProfileSnapshot(uid, callback) {
  return onSnapshot(doc(db, 'users', uid), snap => {
    callback(snap.exists() ? normalizeUserDoc(snap) : null)
  })
}

export async function updateUserRole(uid, roles) {
  const nextRoles = Array.isArray(roles) ? roles : [roles]
  await updateDoc(doc(db, 'users', uid), {
    role: getPrimaryRole({ roles: nextRoles }),
    roles: nextRoles,
  })
}

export async function updateUserProfile(uid, fields) {
  await updateDoc(doc(db, 'users', uid), fields)
}

// ─── Athlete coaching profile (maxHr, zones, results) ────────────────────

export async function updateAthleteMaxHr(uid, maxHr) {
  const value = Number(maxHr)
  await updateDoc(doc(db, 'users', uid), {
    maxHr: Number.isFinite(value) && value > 0 ? value : null,
  })
}

export async function updateAthleteZones(uid, { thresholdHr, vo2maxHr, easyTempo, longTempo }) {
  const numberOrNull = (v) => {
    const n = Number(v)
    return Number.isFinite(n) && n > 0 ? n : null
  }
  await updateDoc(doc(db, 'users', uid), {
    thresholdHr: numberOrNull(thresholdHr),
    vo2maxHr: numberOrNull(vo2maxHr),
    easyTempo: typeof easyTempo === 'string' ? easyTempo.trim() : (easyTempo ?? null),
    longTempo: typeof longTempo === 'string' ? longTempo.trim() : (longTempo ?? null),
  })
}

export async function addAthleteResult(uid, { date, distance, time, note }) {
  // Note: createdAt is an ISO string (not serverTimestamp) because Firestore
  // does not allow sentinel values inside arrayUnion payloads.
  const entry = {
    date: date || new Date().toISOString().slice(0, 10),
    distance: typeof distance === 'string' ? distance.trim() : String(distance ?? ''),
    time: typeof time === 'string' ? time.trim() : String(time ?? ''),
    note: typeof note === 'string' ? note.trim() : '',
    createdAt: new Date().toISOString(),
  }
  await updateDoc(doc(db, 'users', uid), {
    results: arrayUnion(entry),
  })
  return entry
}

export async function removeAthleteResult(uid, entry) {
  await updateDoc(doc(db, 'users', uid), {
    results: arrayRemove(entry),
  })
}

export async function getAllUsers() {
  const snap = await getDocs(collection(db, 'users'))
  return snap.docs.map(normalizeUserDoc)
}

export async function getAllAthletes() {
  const snap = await getDocs(collection(db, 'users'))
  return snap.docs
    .map(normalizeUserDoc)
    .filter(user => Array.isArray(user.roles) ? user.roles.includes('athlete') : user.role === 'athlete')
}

export function onAllUsersSnapshot(callback) {
  return onSnapshot(collection(db, 'users'), snap => {
    callback(snap.docs.map(normalizeUserDoc))
  })
}

// ─── Coach-Athlete Relationships ──────────────────────────────────────────

function getRelationshipId(coachId, athleteId) {
  return `${coachId}_${athleteId}`
}

export async function addRelationship(coachId, athleteId) {
  const id = getRelationshipId(coachId, athleteId)
  await setDoc(doc(db, 'relationships', id), {
    coachId,
    athleteId,
    createdAt: serverTimestamp(),
  })
}

export async function removeRelationship(coachId, athleteId) {
  const id = getRelationshipId(coachId, athleteId)
  await deleteDoc(doc(db, 'relationships', id))
}

export async function getCoachAthletes(coachId) {
  const relSnap = await getDocs(
    query(collection(db, 'relationships'), where('coachId', '==', coachId))
  )
  const athleteIds = Array.from(new Set(relSnap.docs.map(d => d.data().athleteId)))
  if (athleteIds.length === 0) return []

  const snaps = await Promise.all(
    athleteIds.map(uid => getDoc(doc(db, 'users', uid)))
  )
  return snaps.filter(snap => snap.exists()).map(normalizeUserDoc)
}

export function onCoachAthletesSnapshot(coachId, callback) {
  // Subscribe to each athlete individually so Firestore rules can enforce
  // that the coach may only read users they actually coach. Previously this
  // listened to the whole `users` collection, which required overly broad
  // read rules.
  const athleteSubs = new Map()
  const athleteData = new Map()
  let hasRelationships = false

  const publish = () => {
    if (!hasRelationships) return
    const list = Array.from(athleteData.values()).filter(Boolean)
    callback(list)
  }

  const unsubRelationships = onSnapshot(
    query(collection(db, 'relationships'), where('coachId', '==', coachId)),
    snap => {
      const nextIds = new Set(snap.docs.map(d => d.data().athleteId))

      // Tear down listeners for athletes that are no longer linked.
      for (const [uid, unsub] of athleteSubs.entries()) {
        if (!nextIds.has(uid)) {
          unsub()
          athleteSubs.delete(uid)
          athleteData.delete(uid)
        }
      }

      // Start a listener per newly linked athlete.
      for (const uid of nextIds) {
        if (athleteSubs.has(uid)) continue
        const unsub = onSnapshot(doc(db, 'users', uid), userSnap => {
          if (userSnap.exists()) {
            athleteData.set(uid, normalizeUserDoc(userSnap))
          } else {
            athleteData.delete(uid)
          }
          publish()
        })
        athleteSubs.set(uid, unsub)
      }

      hasRelationships = true
      publish()
    }
  )

  return () => {
    unsubRelationships()
    for (const unsub of athleteSubs.values()) unsub()
    athleteSubs.clear()
    athleteData.clear()
  }
}

export async function getAthleteCoaches(athleteId) {
  const relSnap = await getDocs(
    query(collection(db, 'relationships'), where('athleteId', '==', athleteId))
  )
  const coachIds = Array.from(new Set(relSnap.docs.map(d => d.data().coachId)))
  if (coachIds.length === 0) return []

  const snaps = await Promise.all(
    coachIds.map(uid => getDoc(doc(db, 'users', uid)))
  )
  return snaps.filter(snap => snap.exists()).map(normalizeUserDoc)
}

export function onRelationshipsSnapshot(callback) {
  return onSnapshot(collection(db, 'relationships'), snap => {
    callback(snap.docs.map(d => ({ id: d.id, ...d.data() })))
  })
}
