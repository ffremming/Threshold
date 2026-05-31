// User profile reads, writes and live subscriptions.
import {
  doc, setDoc, getDoc, updateDoc, collection,
  onSnapshot, serverTimestamp,
} from 'firebase/firestore'
import { db } from '../firebase'
import { getPrimaryRole } from '../roles'
import { withDatabaseWriteLimit } from '../security/rateLimits'
import { normalizeUserDoc } from './firestore'

export async function createUserProfile(uid, email, displayName, role = 'athlete') {
  const roles = Array.isArray(role) ? role : [role]
  await withDatabaseWriteLimit('users', () => setDoc(doc(db, 'users', uid), {
    uid,
    email,
    displayName,
    workoutLayout: 'list',
    role: getPrimaryRole({ roles }),
    roles,
    status: 'pending',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  }))
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
  await withDatabaseWriteLimit('users', () => updateDoc(doc(db, 'users', uid), {
    role: getPrimaryRole({ roles: nextRoles }),
    roles: nextRoles,
    updatedAt: serverTimestamp(),
  }))
}

export async function updateUserStatus(uid, status) {
  await withDatabaseWriteLimit('users', () => updateDoc(doc(db, 'users', uid), {
    status,
    updatedAt: serverTimestamp(),
  }))
}

export async function updateUserProfile(uid, fields) {
  await withDatabaseWriteLimit('users', () => updateDoc(doc(db, 'users', uid), {
    ...fields,
    updatedAt: serverTimestamp(),
  }))
}

export function onAllUsersSnapshot(callback) {
  return onSnapshot(collection(db, 'users'), snap => {
    callback(snap.docs.map(normalizeUserDoc))
  })
}
