// Coach <-> athlete relationship reads, writes and live subscriptions.
import {
  doc, setDoc, getDocs, deleteDoc,
  collection, query, where, onSnapshot, serverTimestamp,
} from 'firebase/firestore'
import { db } from '../firebase'
import { withDatabaseWriteLimit } from '../security/rateLimits'
import { normalizeUserDoc, relationshipId } from './firestore'

export async function addRelationship(coachId, athleteId) {
  await withDatabaseWriteLimit('relationships', () => setDoc(doc(db, 'relationships', relationshipId(coachId, athleteId)), {
    coachId,
    athleteId,
    createdAt: serverTimestamp(),
  }))
}

export async function removeRelationship(coachId, athleteId) {
  await withDatabaseWriteLimit('relationships', () => deleteDoc(doc(db, 'relationships', relationshipId(coachId, athleteId))))
}

export function onRelationshipsSnapshot(callback) {
  return onSnapshot(collection(db, 'relationships'), snap => {
    callback(snap.docs.map(d => ({ id: d.id, ...d.data() })))
  })
}

// Live list of active coaches, for athletes browsing who to link to.
// Firestore rules permit any active user to read docs whose roles include 'coach'.
export function onCoachesSnapshot(callback) {
  return onSnapshot(
    query(collection(db, 'users'), where('roles', 'array-contains', 'coach')),
    snap => {
      const coaches = snap.docs
        .map(normalizeUserDoc)
        .filter(u => (u.status || 'active') === 'active')
      callback(coaches)
    }
  )
}

// Subscribe to each athlete individually so Firestore rules can enforce that
// a coach only reads users they actually coach (avoids a broad collection read).
export function onCoachAthletesSnapshot(coachId, callback) {
  const athleteSubs = new Map()
  const athleteData = new Map()
  let hasRelationships = false

  const publish = () => {
    if (!hasRelationships) return
    callback(Array.from(athleteData.values()).filter(Boolean))
  }

  const unsubRelationships = onSnapshot(
    query(collection(db, 'relationships'), where('coachId', '==', coachId)),
    snap => {
      const nextIds = new Set(snap.docs.map(d => d.data().athleteId))

      for (const [uid, unsub] of athleteSubs.entries()) {
        if (!nextIds.has(uid)) {
          unsub()
          athleteSubs.delete(uid)
          athleteData.delete(uid)
        }
      }

      for (const uid of nextIds) {
        if (athleteSubs.has(uid)) continue
        const unsub = onSnapshot(doc(db, 'users', uid), userSnap => {
          if (userSnap.exists()) athleteData.set(uid, normalizeUserDoc(userSnap))
          else athleteData.delete(uid)
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
