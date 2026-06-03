import { onCall, HttpsError } from 'firebase-functions/v2/https'
import { getFirestore } from 'firebase-admin/firestore'
import { STRAVA_API_BASE, STRAVA_SECRETS } from './config.js'
import { getValidConnection } from './tokens.js'

export const stravaDisconnect = onCall({ secrets: STRAVA_SECRETS }, async (req) => {
  if (!req.auth) throw new HttpsError('unauthenticated', 'Sign in required')
  const athleteId = req.auth.uid // only deauthorize your own connection
  const db = getFirestore()
  const ref = db.collection('stravaConnections').doc(athleteId)
  const snap = await ref.get()
  if (!snap.exists) return { ok: true }

  try {
    const nowSeconds = Math.floor(Date.now() / 1000)
    const conn = await getValidConnection(athleteId, nowSeconds)
    await fetch(`https://www.strava.com/oauth/deauthorize`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${conn.accessToken}` },
    })
  } catch (err) {
    console.error('Strava deauthorize failed (continuing)', err)
  }
  await ref.delete()
  return { ok: true }
})
