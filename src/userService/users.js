// User profile reads, writes and live subscriptions.
import {
  doc, setDoc, getDoc, updateDoc, collection,
  onSnapshot, serverTimestamp,
} from 'firebase/firestore'
import { db } from '../firebase'
import { getPrimaryRole } from '../roles'
import { normalizeUserDoc } from './firestore'

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

export function onAllUsersSnapshot(callback) {
  return onSnapshot(collection(db, 'users'), snap => {
    callback(snap.docs.map(normalizeUserDoc))
  })
}
