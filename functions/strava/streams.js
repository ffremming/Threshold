import { onCall, HttpsError } from 'firebase-functions/v2/https'
import { getFirestore } from 'firebase-admin/firestore'
import { STRAVA_API_BASE, STRAVA_SECRETS } from './config.js'
import { getValidConnection } from './tokens.js'

// Verify the caller may access this athlete (self, coach, or superadmin).
async function assertCanAccess(callerUid, athleteId) {
  if (callerUid === athleteId) return
  const db = getFirestore()
  const userSnap = await db.collection('users').doc(callerUid).get()
  const data = userSnap.exists ? userSnap.data() : {}
  const isSuper = data.role === 'superadmin' ||
    (Array.isArray(data.roles) && data.roles.includes('superadmin'))
  if (isSuper) return
  const rel = await db.collection('relationships').doc(`${callerUid}_${athleteId}`).get()
  if (rel.exists) return
  throw new HttpsError('permission-denied', 'Not allowed to access this athlete')
}

export const stravaActivityStreams = onCall({ secrets: STRAVA_SECRETS }, async (req) => {
  if (!req.auth) throw new HttpsError('unauthenticated', 'Sign in required')
  const { athleteId, activityId, keys } = req.data || {}
  if (!athleteId || !activityId) {
    throw new HttpsError('invalid-argument', 'athleteId and activityId required')
  }
  await assertCanAccess(req.auth.uid, athleteId)

  const streamKeys = keys || 'heartrate,time,distance'
  const nowSeconds = Math.floor(Date.now() / 1000)
  const conn = await getValidConnection(athleteId, nowSeconds)

  const url = `${STRAVA_API_BASE}/activities/${activityId}/streams` +
    `?keys=${encodeURIComponent(streamKeys)}&key_by_type=true`
  const res = await fetch(url, { headers: { Authorization: `Bearer ${conn.accessToken}` } })
  if (!res.ok) throw new HttpsError('unavailable', `Strava streams failed: ${res.status}`)
  return await res.json() // { heartrate: {data:[...]}, time: {data:[...]}, ... }
})
