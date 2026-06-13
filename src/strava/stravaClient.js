import { collection, query, where, onSnapshot } from 'firebase/firestore'
import { httpsCallable } from 'firebase/functions'
import { auth, db, functions } from '../firebase'

// Public client id is safe in the bundle. Set via Vite env.
const CLIENT_ID = import.meta.env.VITE_STRAVA_CLIENT_ID
const CALLBACK_URL = import.meta.env.VITE_STRAVA_CALLBACK_URL // stravaCallback function URL

// Build the Strava authorize URL. We pass the Firebase ID token as `state`
// so the callback can identify the athlete server-side.
export async function buildStravaAuthorizeUrl() {
  if (!auth.currentUser) throw new Error('Not signed in — cannot connect Strava.')
  const idToken = await auth.currentUser.getIdToken()
  const params = new URLSearchParams({
    client_id: CLIENT_ID,
    redirect_uri: CALLBACK_URL,
    response_type: 'code',
    scope: 'read,activity:read',
    approval_prompt: 'auto',
    state: idToken,
  })
  return `https://www.strava.com/oauth/authorize?${params.toString()}`
}

export function subscribeCompletedActivities(athleteId, callback) {
  if (!athleteId) { callback([]); return () => {} }
  const q = query(
    collection(db, 'completedActivities'),
    where('athleteId', '==', athleteId),
  )
  return onSnapshot(
    q,
    snap => {
      const items = snap.docs
        .map(d => ({ id: d.id, ...d.data() }))
        .sort((a, b) => (b.startDate?.seconds || 0) - (a.startDate?.seconds || 0))
      callback(items)
    },
    err => {
      console.error('subscribeCompletedActivities listen error:', err)
      callback([])
    },
  )
}

// Session-scoped in-memory cache: never fetch the same streams from Strava
// twice in one browser session. Cleared on page reload.
const streamCache = new Map()

export async function fetchActivityStreams(athleteId, activityId, keys) {
  const cacheKey = `${athleteId}:${activityId}:${keys || 'default'}`
  if (streamCache.has(cacheKey)) return streamCache.get(cacheKey)

  const call = httpsCallable(functions, 'stravaActivityStreams')
  // Store the in-flight promise so concurrent calls for the same activity
  // share one request rather than firing duplicates.
  const promise = call({ athleteId, activityId, keys })
    .then(({ data }) => data)
    .catch(err => { streamCache.delete(cacheKey); throw err })
  streamCache.set(cacheKey, promise)
  return promise
}

export async function disconnectStrava() {
  const call = httpsCallable(functions, 'stravaDisconnect')
  await call({})
}
