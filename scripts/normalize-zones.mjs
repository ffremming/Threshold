#!/usr/bin/env node
// Normalize Firestore workout/template intensity zones.
// Run: npm run normalize-zones

import { createInterface } from 'readline'
import { initializeApp } from 'firebase/app'
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth'
import { collection, doc, getDocs, getFirestore, updateDoc } from 'firebase/firestore'

const firebaseConfig = {
  apiKey: process.env.VITE_FIREBASE_API_KEY,
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.VITE_FIREBASE_APP_ID,
}

if (!firebaseConfig.apiKey) {
  console.error('Missing VITE_FIREBASE_* env vars. Run via: npm run normalize-zones')
  process.exit(1)
}

function hasIntensityZone(type) {
  return type !== 'styrke'
}

function getDefaultIntensityZone(type) {
  if (!hasIntensityZone(type)) return null
  if (type === 'interval' || type === 'terskel') return 3
  return 2
}

function getAllowedIntensityZones(type) {
  if (!hasIntensityZone(type)) return []
  if (type === 'interval' || type === 'terskel') return [3, 4]
  return [1, 2, 3, 4]
}

function normalizeIntensityZone(type, intensityZone) {
  const allowedZones = getAllowedIntensityZones(type)
  if (allowedZones.length === 0) return null

  const parsedZone = Number(intensityZone)
  if (allowedZones.includes(parsedZone)) return parsedZone
  if (parsedZone === 5 && allowedZones.includes(4)) return 4

  return getDefaultIntensityZone(type)
}

const rl = createInterface({ input: process.stdin, output: process.stdout })
const ask = q => new Promise(resolve => rl.question(q, resolve))

async function normalizeCollection(db, name) {
  const snap = await getDocs(collection(db, name))
  let updatedCount = 0

  for (const entry of snap.docs) {
    const data = entry.data()
    const normalizedZone = normalizeIntensityZone(data.type, data.intensityZone)
    const nextZone = normalizedZone ?? null
    const currentZone = data.intensityZone ?? null

    if (currentZone === nextZone) continue

    await updateDoc(doc(db, name, entry.id), { intensityZone: nextZone })
    updatedCount += 1
  }

  return { total: snap.size, updated: updatedCount }
}

async function main() {
  console.log('\n🔧 Normaliserer intensitetssoner i Firestore\n')
  const email = await ask('Admin e-post: ')
  const password = await ask('Passord: ')
  rl.close()

  const app = initializeApp(firebaseConfig)
  const auth = getAuth(app)
  const db = getFirestore(app)

  try {
    await signInWithEmailAndPassword(auth, email, password)
    console.log('✓ Logget inn')
  } catch (err) {
    console.error('❌ Innlogging feilet:', err.message)
    process.exit(1)
  }

  const workouts = await normalizeCollection(db, 'workouts')
  const templates = await normalizeCollection(db, 'templates')

  console.log(`\nWorkouts: ${workouts.updated} oppdatert av ${workouts.total}`)
  console.log(`Templates: ${templates.updated} oppdatert av ${templates.total}`)
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
