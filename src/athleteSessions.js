import {
  collection, query, where, onSnapshot, addDoc, updateDoc, deleteDoc, doc,
  serverTimestamp,
} from 'firebase/firestore'
import { db } from './firebase'
import { normalizeBlocks } from './sessionBlocks'

const COLLECTION = 'athleteSessions'

function stripSessionFields(template) {
  // Pick session-shaped fields off any source (bank template, library template).
  const {
    title, type, activityTag, intensityZone, loadTag, category,
    description, sessionDetails, warmup, cooldown, notes,
    exercises, rest, distance, blocks,
  } = template || {}
  return {
    title: title || 'New session',
    type: type || 'rolig',
    activityTag: activityTag || 'run',
    intensityZone: Array.isArray(intensityZone) ? intensityZone : (intensityZone ? [intensityZone] : []),
    loadTag: loadTag || 'low',
    category: category || '',
    description: description || '',
    sessionDetails: sessionDetails || '',
    warmup: warmup || '',
    cooldown: cooldown || '',
    notes: notes || '',
    exercises: exercises || '',
    rest: rest || '',
    distance: distance || '',
    blocks: normalizeBlocks(blocks, activityTag) || null,
  }
}

export function subscribeAthleteSessions(coachId, athleteId, callback) {
  if (!coachId || !athleteId) {
    callback([])
    return () => {}
  }
  const q = query(
    collection(db, COLLECTION),
    where('coachId', '==', coachId),
    where('athleteId', '==', athleteId),
  )
  return onSnapshot(q, snap => {
    const items = snap.docs
      .map(d => ({ id: d.id, ...d.data() }))
      .sort((a, b) => (a.title || '').localeCompare(b.title || ''))
    callback(items)
  }, () => callback([]))
}

export async function addAthleteSessionFromBank(coachId, athleteId, bankTemplate) {
  const session = stripSessionFields(bankTemplate)
  return addDoc(collection(db, COLLECTION), {
    coachId,
    athleteId,
    sourceBankId: bankTemplate?.id || null,
    ...session,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  })
}

export async function addAthleteSession(coachId, athleteId, data) {
  const session = stripSessionFields(data)
  return addDoc(collection(db, COLLECTION), {
    coachId,
    athleteId,
    sourceBankId: data?.sourceBankId || null,
    ...session,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  })
}

export async function updateAthleteSession(sessionId, fields) {
  const next = stripSessionFields(fields)
  await updateDoc(doc(db, COLLECTION, sessionId), {
    ...next,
    updatedAt: serverTimestamp(),
  })
}

export async function deleteAthleteSession(sessionId) {
  await deleteDoc(doc(db, COLLECTION, sessionId))
}
