import { getFirestore } from 'firebase-admin/firestore'
import {
  STRAVA_OAUTH_TOKEN_URL, STRAVA_CLIENT_ID, STRAVA_CLIENT_SECRET,
} from './config.js'

const REFRESH_BUFFER_SECONDS = 60

// Pure: decide whether the access token is (about to be) expired.
export function needsRefresh(expiresAt, nowSeconds) {
  return expiresAt - REFRESH_BUFFER_SECONDS <= nowSeconds
}

// IO: exchange the refresh token for a new access token.
export async function refreshAccessToken(refreshToken) {
  const res = await fetch(STRAVA_OAUTH_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_id: STRAVA_CLIENT_ID.value(),
      client_secret: STRAVA_CLIENT_SECRET.value(),
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
    }),
  })
  if (!res.ok) throw new Error(`Strava token refresh failed: ${res.status}`)
  return res.json() // { access_token, refresh_token, expires_at, ... }
}

// IO: load a connection, refresh+persist if needed, return a valid access token.
export async function getValidConnection(athleteId, nowSeconds) {
  const db = getFirestore()
  const ref = db.collection('stravaConnections').doc(athleteId)
  const snap = await ref.get()
  if (!snap.exists) throw new Error(`No Strava connection for ${athleteId}`)
  const conn = snap.data()

  if (!needsRefresh(conn.expiresAt, nowSeconds)) return conn

  try {
    const t = await refreshAccessToken(conn.refreshToken)
    const updated = {
      accessToken: t.access_token,
      refreshToken: t.refresh_token,
      expiresAt: t.expires_at,
      status: 'connected',
    }
    await ref.set(updated, { merge: true })
    return { ...conn, ...updated }
  } catch (err) {
    await ref.set({ status: 'disconnected' }, { merge: true })
    throw err
  }
}
