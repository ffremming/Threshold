import { onRequest } from 'firebase-functions/v2/https'
import { getFirestore, Timestamp } from 'firebase-admin/firestore'
import { getAuth } from 'firebase-admin/auth'
import {
  STRAVA_OAUTH_TOKEN_URL, STRAVA_CLIENT_ID, STRAVA_CLIENT_SECRET, STRAVA_SECRETS,
} from './config.js'

// The app passes the athlete's Firebase ID token in `state`; we verify it here
// so we know which athlete (and their coach) to attach the connection to.
export const stravaCallback = onRequest({ secrets: STRAVA_SECRETS }, async (req, res) => {
  const { code, state, error } = req.query
  if (error) return res.status(400).send(`Strava authorization denied: ${error}`)
  if (!code || !state) return res.status(400).send('Missing code or state')

  let decoded
  try {
    decoded = await getAuth().verifyIdToken(String(state))
  } catch {
    return res.status(401).send('Invalid state token')
  }
  const athleteId = decoded.uid

  const tokenRes = await fetch(STRAVA_OAUTH_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_id: STRAVA_CLIENT_ID.value(),
      client_secret: STRAVA_CLIENT_SECRET.value(),
      code,
      grant_type: 'authorization_code',
    }),
  })
  if (!tokenRes.ok) return res.status(502).send('Token exchange failed')
  const t = await tokenRes.json()

  // coachId: resolved from the relationships collection (doc id `{coachId}_{athleteId}`,
  // with coachId/athleteId stored as fields). An athlete may have multiple coaches;
  // we store the first as the denormalized owner and fall back to self.
  const db = getFirestore()
  const relSnap = await db.collection('relationships')
    .where('athleteId', '==', athleteId).limit(1).get()
  const coachId = relSnap.empty ? athleteId : relSnap.docs[0].data().coachId

  await db.collection('stravaConnections').doc(athleteId).set({
    athleteId,
    coachId,
    stravaAthleteId: t.athlete?.id ?? null,
    accessToken: t.access_token,
    refreshToken: t.refresh_token,
    expiresAt: t.expires_at,
    scope: t.scope || '',
    status: 'connected',
    connectedAt: Timestamp.now(),
  })

  // Redirect back into the app.
  return res.redirect('/?strava=connected')
})
