import { onRequest } from 'firebase-functions/v2/https'
import { getFirestore } from 'firebase-admin/firestore'
import {
  STRAVA_API_BASE, STRAVA_VERIFY_TOKEN, STRAVA_SECRETS,
} from './config.js'
import { getValidConnection } from './tokens.js'
import { normalizeActivity } from './normalize.js'

async function importActivity(stravaAthleteId, activityId) {
  const db = getFirestore()
  const connSnap = await db.collection('stravaConnections')
    .where('stravaAthleteId', '==', stravaAthleteId).limit(1).get()
  if (connSnap.empty) return // unknown athlete: drop
  const athleteId = connSnap.docs[0].id

  const nowSeconds = Math.floor(Date.now() / 1000)
  const conn = await getValidConnection(athleteId, nowSeconds)

  const auth = { Authorization: `Bearer ${conn.accessToken}` }

  const res = await fetch(`${STRAVA_API_BASE}/activities/${activityId}`, { headers: auth })
  if (!res.ok) throw new Error(`Activity fetch failed: ${res.status}`)
  const detail = await res.json()

  // Activity Zones (time-in-HR-zone) power the analysis adapter's intensityZone
  // derivation. Best-effort: not all activities have zones.
  let zones = null
  try {
    const zres = await fetch(`${STRAVA_API_BASE}/activities/${activityId}/zones`, { headers: auth })
    if (zres.ok) zones = await zres.json()
  } catch (err) {
    console.error('Zones fetch failed (continuing without zones)', err)
  }

  const doc = normalizeActivity(detail, athleteId, conn.coachId)
  doc.zones = zones
  doc.importedAt = new Date()
  await db.collection('completedActivities').doc(`strava_${activityId}`).set(doc)
}

export const stravaWebhook = onRequest({ secrets: STRAVA_SECRETS }, async (req, res) => {
  // GET: subscription validation handshake.
  if (req.method === 'GET') {
    const mode = req.query['hub.mode']
    const token = req.query['hub.verify_token']
    const challenge = req.query['hub.challenge']
    if (mode === 'subscribe' && token === STRAVA_VERIFY_TOKEN.value()) {
      return res.status(200).json({ 'hub.challenge': challenge })
    }
    return res.status(403).send('Forbidden')
  }

  // POST: event. Ack immediately, then process.
  if (req.method === 'POST') {
    res.status(200).send('ok')
    const evt = req.body || {}
    if (evt.object_type === 'activity' &&
        (evt.aspect_type === 'create' || evt.aspect_type === 'update')) {
      try {
        await importActivity(evt.owner_id, evt.object_id)
      } catch (err) {
        console.error('Strava import failed', err)
      }
    }
    return
  }

  return res.status(405).send('Method not allowed')
})
