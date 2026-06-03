# Strava Integration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let athletes link Strava once so their completed activities auto-import into a per-athlete completed-activities log, with HR/streams fetched on demand.

**Architecture:** A new Firebase Cloud Functions backend (Node 20, v2 functions) holds the Strava `client_secret`, handles OAuth callback + token refresh, receives Strava webhooks to import activity summaries (+ HR zones) into Firestore, and exposes an authenticated callable for on-demand stream fetches. The React app gains a Strava connection UI, a completed-activities view with a session-cached HR chart, and an adapter that feeds imported activities into the existing AnalysisDashboard as the source of truth for past weeks. Streams are never persisted in phase 1.

**Tech Stack:** Firebase Cloud Functions v2 (`firebase-functions`, `firebase-admin`), Node 20, Vitest (existing app tests), React 18 + Firebase modular SDK v12, Chart.js (already present).

---

## Operational Prerequisites (manual, done once by the user — not code tasks)

These must be completed before Tasks 6–8 can be tested end-to-end. They are listed here so the implementer knows the values they depend on exist.

1. Create a Strava API application at https://www.strava.com/settings/api → obtain `client_id` and `client_secret`. Set "Authorization Callback Domain" to the Functions host (e.g. `<region>-<project>.cloudfunctions.net`, and `localhost` for local testing).
2. Choose a random `verify_token` string for webhook handshake.
3. After Functions deploy, register the webhook subscription (one-time `curl` POST, given in Task 8).

Secrets are configured via Firebase Functions params (Task 2), never committed.

---

## File Structure

**New backend (`functions/`):**
- `functions/package.json` — Functions deps + Node engine.
- `functions/.gitignore` — ignore `node_modules`, local env.
- `functions/index.js` — exports all functions (thin; delegates to modules).
- `functions/strava/config.js` — reads secret params, builds Strava URLs/constants.
- `functions/strava/tokens.js` — `needsRefresh`, `refreshAccessToken`, `getValidConnection` (pure + IO split).
- `functions/strava/normalize.js` — `normalizeActivity` (Strava detail → Firestore doc), `sliceStreamByLaps` (pure).
- `functions/strava/oauthCallback.js` — `stravaCallback` HTTPS handler.
- `functions/strava/webhook.js` — `stravaWebhook` HTTPS handler (GET verify + POST event).
- `functions/strava/streams.js` — `stravaActivityStreams` callable.
- `functions/strava/disconnect.js` — `stravaDisconnect` callable.
- `functions/test/*.test.js` — Vitest unit tests for pure functions.

**Frontend (`src/`):**
- `src/strava/stravaClient.js` — build authorize URL, call callables, subscribe to `completedActivities`, session-scoped stream cache.
- `src/strava/StravaConnectButton.jsx` — connect/disconnect UI + status.
- `src/strava/CompletedActivities.jsx` — list view + on-demand HR chart.
- `src/strava/activityToWorkout.js` — pure adapter: Strava activity → analysis workout shape + past-week merge.
- `src/firebase.js` — add `getFunctions` export (modify).
- `src/components/AdminDashboard/derived.js` + the hook assembling `analysisWorkouts` — merge Strava activities into analysis (modify).

**Config:**
- `firebase.json` — add `functions` block (modify).
- `firestore.rules` — add `completedActivities` + `stravaConnections` rules (modify).

---

## Task 1: Scaffold the Functions backend

**Files:**
- Create: `functions/package.json`
- Create: `functions/.gitignore`
- Create: `functions/index.js`
- Modify: `firebase.json`

- [ ] **Step 1: Create `functions/package.json`**

```json
{
  "name": "threshold-functions",
  "type": "module",
  "engines": { "node": "20" },
  "main": "index.js",
  "scripts": {
    "test": "vitest run",
    "serve": "firebase emulators:start --only functions",
    "deploy": "firebase deploy --only functions"
  },
  "dependencies": {
    "firebase-admin": "^12.7.0",
    "firebase-functions": "^6.1.0"
  },
  "devDependencies": {
    "vitest": "^2.1.9"
  }
}
```

- [ ] **Step 2: Create `functions/.gitignore`**

```
node_modules/
.env
.env.*
*.log
```

- [ ] **Step 3: Create a placeholder `functions/index.js`**

```js
import { initializeApp } from 'firebase-admin/app'

initializeApp()

// Strava functions are wired up in later tasks.
```

- [ ] **Step 4: Add the functions block to `firebase.json`**

Add this top-level key alongside the existing `hosting` and `firestore` keys:

```json
  "functions": {
    "source": "functions",
    "runtime": "nodejs20"
  }
```

- [ ] **Step 5: Install deps**

Run: `cd functions && npm install`
Expected: `node_modules/` created, no errors.

- [ ] **Step 6: Commit**

```bash
git add functions/package.json functions/.gitignore functions/index.js firebase.json
git commit -m "feat(strava): scaffold cloud functions backend"
```

---

## Task 2: Strava config + secret params

**Files:**
- Create: `functions/strava/config.js`

- [ ] **Step 1: Create `functions/strava/config.js`**

```js
import { defineSecret } from 'firebase-functions/params'

// Set with: firebase functions:secrets:set STRAVA_CLIENT_SECRET (etc.)
export const STRAVA_CLIENT_ID = defineSecret('STRAVA_CLIENT_ID')
export const STRAVA_CLIENT_SECRET = defineSecret('STRAVA_CLIENT_SECRET')
export const STRAVA_VERIFY_TOKEN = defineSecret('STRAVA_VERIFY_TOKEN')

export const STRAVA_OAUTH_TOKEN_URL = 'https://www.strava.com/oauth/token'
export const STRAVA_API_BASE = 'https://www.strava.com/api/v3'
export const STRAVA_SCOPE = 'read,activity:read'

export const STRAVA_SECRETS = [
  STRAVA_CLIENT_ID,
  STRAVA_CLIENT_SECRET,
  STRAVA_VERIFY_TOKEN,
]
```

- [ ] **Step 2: Commit**

```bash
git add functions/strava/config.js
git commit -m "feat(strava): define secret params and api constants"
```

> Note: actual secret values are set by the user via `firebase functions:secrets:set STRAVA_CLIENT_ID` etc. — not in code.

---

## Task 3: Token refresh logic (pure + IO)

**Files:**
- Create: `functions/strava/tokens.js`
- Test: `functions/test/tokens.test.js`

- [ ] **Step 1: Write the failing test**

`functions/test/tokens.test.js`:

```js
import { describe, it, expect } from 'vitest'
import { needsRefresh } from '../strava/tokens.js'

describe('needsRefresh', () => {
  it('is true when expiry is in the past', () => {
    expect(needsRefresh(1000, 2000)).toBe(true)
  })
  it('is true within the 60s safety window', () => {
    expect(needsRefresh(2000, 1950)).toBe(true) // 50s left < 60s buffer
  })
  it('is false when comfortably valid', () => {
    expect(needsRefresh(10000, 1000)).toBe(false)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd functions && npx vitest run test/tokens.test.js`
Expected: FAIL — `needsRefresh` is not exported / not defined.

- [ ] **Step 3: Implement `functions/strava/tokens.js`**

```js
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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd functions && npx vitest run test/tokens.test.js`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add functions/strava/tokens.js functions/test/tokens.test.js
git commit -m "feat(strava): token refresh decision and connection loader"
```

---

## Task 4: Activity normalization + lap slicing (pure)

**Files:**
- Create: `functions/strava/normalize.js`
- Test: `functions/test/normalize.test.js`

- [ ] **Step 1: Write the failing test**

`functions/test/normalize.test.js`:

```js
import { describe, it, expect } from 'vitest'
import { normalizeActivity, sliceStreamByLaps } from '../strava/normalize.js'

const detail = {
  id: 123, name: 'Morning Run', sport_type: 'Run',
  start_date: '2026-06-01T07:00:00Z',
  moving_time: 1800, elapsed_time: 1850, distance: 5000,
  total_elevation_gain: 40, has_heartrate: true,
  average_heartrate: 150, max_heartrate: 175, average_watts: null,
  laps: [
    { lap_index: 1, distance: 2500, moving_time: 900, start_date: '2026-06-01T07:00:00Z', average_cadence: 80, average_watts: null, average_speed: 2.8 },
    { lap_index: 2, distance: 2500, moving_time: 900, start_date: '2026-06-01T07:15:00Z', average_cadence: 82, average_watts: null, average_speed: 2.9 },
  ],
}

describe('normalizeActivity', () => {
  it('maps core fields and trims laps', () => {
    const doc = normalizeActivity(detail, 'ath1', 'coach1')
    expect(doc.athleteId).toBe('ath1')
    expect(doc.coachId).toBe('coach1')
    expect(doc.source).toBe('strava')
    expect(doc.stravaActivityId).toBe(123)
    expect(doc.type).toBe('Run')
    expect(doc.distance).toBe(5000)
    expect(doc.averageHeartrate).toBe(150)
    expect(doc.laps).toHaveLength(2)
    expect(doc.laps[0]).toMatchObject({ index: 1, distance: 2500, movingTime: 900 })
  })
  it('omits heartrate fields when not present', () => {
    const doc = normalizeActivity({ id: 9, sport_type: 'Ride', has_heartrate: false, laps: [] }, 'a', 'c')
    expect(doc.averageHeartrate).toBeNull()
  })
})

describe('sliceStreamByLaps', () => {
  it('splits a stream into per-lap windows by time', () => {
    const time = [0, 10, 20, 30, 40]
    const heartrate = [100, 110, 120, 130, 140]
    // lap 1 covers t=0..20, lap 2 covers t=20..40
    const laps = [
      { startOffset: 0, elapsed: 20 },
      { startOffset: 20, elapsed: 20 },
    ]
    const result = sliceStreamByLaps(time, heartrate, laps)
    expect(result[0]).toEqual([100, 110, 120])
    expect(result[1]).toEqual([120, 130, 140])
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd functions && npx vitest run test/normalize.test.js`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `functions/strava/normalize.js`**

```js
import { Timestamp } from 'firebase-admin/firestore'

function toTimestamp(iso) {
  return iso ? Timestamp.fromDate(new Date(iso)) : null
}

export function normalizeActivity(detail, athleteId, coachId) {
  const hasHr = !!detail.has_heartrate
  return {
    athleteId,
    coachId,
    source: 'strava',
    stravaActivityId: detail.id,
    name: detail.name || '',
    type: detail.sport_type || detail.type || '',
    startDate: toTimestamp(detail.start_date),
    movingTime: detail.moving_time ?? null,
    elapsedTime: detail.elapsed_time ?? null,
    distance: detail.distance ?? null,
    totalElevation: detail.total_elevation_gain ?? null,
    averageHeartrate: hasHr ? (detail.average_heartrate ?? null) : null,
    maxHeartrate: hasHr ? (detail.max_heartrate ?? null) : null,
    averageWatts: detail.average_watts ?? null,
    laps: (detail.laps || []).map(l => ({
      index: l.lap_index ?? null,
      distance: l.distance ?? null,
      movingTime: l.moving_time ?? null,
      startDate: toTimestamp(l.start_date),
      averageCadence: l.average_cadence ?? null,
      averageWatts: l.average_watts ?? null,
      averageSpeed: l.average_speed ?? null,
    })),
  }
}

// Pure: given aligned time[] + values[], split values into per-lap windows.
// laps: [{ startOffset (seconds), elapsed (seconds) }]
export function sliceStreamByLaps(time, values, laps) {
  return laps.map(({ startOffset, elapsed }) => {
    const end = startOffset + elapsed
    const out = []
    for (let i = 0; i < time.length; i++) {
      if (time[i] >= startOffset && time[i] <= end) out.push(values[i])
    }
    return out
  })
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd functions && npx vitest run test/normalize.test.js`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add functions/strava/normalize.js functions/test/normalize.test.js
git commit -m "feat(strava): activity normalizer and per-lap stream slicer"
```

---

## Task 5: Firestore rules for new collections

**Files:**
- Modify: `firestore.rules`

- [ ] **Step 1: Add rules blocks**

Inside `match /databases/{database}/documents { ... }`, after the existing
`match /tests/{testId}` block, add:

```
    match /completedActivities/{activityId} {
      // Imported and written only by Cloud Functions (Admin SDK bypasses rules).
      allow read: if canAccessAthlete(resource.data.athleteId);
      allow write: if false;
    }

    match /stravaConnections/{athleteId} {
      // Token storage. Read by owner/coach; never client-writable.
      allow read: if canAccessAthlete(athleteId);
      allow write: if false;
    }
```

- [ ] **Step 2: Validate rules compile**

Run: `firebase deploy --only firestore:rules --dry-run` (or `firebase emulators:start --only firestore` and confirm no parse errors).
Expected: rules compile without syntax errors.

- [ ] **Step 3: Commit**

```bash
git add firestore.rules
git commit -m "feat(strava): firestore rules for completedActivities and stravaConnections"
```

---

## Task 6: OAuth callback function

**Files:**
- Create: `functions/strava/oauthCallback.js`
- Modify: `functions/index.js`

- [ ] **Step 1: Implement `functions/strava/oauthCallback.js`**

```js
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
```

> Note (verified): there is NO `coachId` field on user docs. The coach link lives
> in the `relationships` collection — doc id `{coachId}_{athleteId}`
> (`relationshipId()` in `src/userService/firestore.js`), with `coachId` and
> `athleteId` stored as fields. Hence the `where('athleteId','==',athleteId)`
> query above. The streams callable's `assertCanAccess` uses the deterministic
> doc id `{callerUid}_{athleteId}` to check a coach relationship, which is correct.

- [ ] **Step 2: Wire into `functions/index.js`**

Replace the placeholder comment with:

```js
export { stravaCallback } from './strava/oauthCallback.js'
```

- [ ] **Step 3: Lint-check by emulator load**

Run: `cd functions && firebase emulators:start --only functions`
Expected: emulator starts and lists `stravaCallback` without import errors. Stop with Ctrl-C.

- [ ] **Step 4: Commit**

```bash
git add functions/strava/oauthCallback.js functions/index.js
git commit -m "feat(strava): oauth callback token exchange"
```

---

## Task 7: Webhook function (verify + import)

**Files:**
- Create: `functions/strava/webhook.js`
- Modify: `functions/index.js`

- [ ] **Step 1: Implement `functions/strava/webhook.js`**

```js
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
```

- [ ] **Step 2: Wire into `functions/index.js`**

Add:

```js
export { stravaWebhook } from './strava/webhook.js'
```

- [ ] **Step 3: Emulator load check**

Run: `cd functions && firebase emulators:start --only functions`
Expected: both `stravaCallback` and `stravaWebhook` listed, no import errors.

- [ ] **Step 4: Commit**

```bash
git add functions/strava/webhook.js functions/index.js
git commit -m "feat(strava): webhook verification and activity import"
```

---

## Task 8: Streams callable + disconnect callable

**Files:**
- Create: `functions/strava/streams.js`
- Create: `functions/strava/disconnect.js`
- Modify: `functions/index.js`

- [ ] **Step 1: Implement `functions/strava/streams.js`**

```js
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
```

- [ ] **Step 2: Implement `functions/strava/disconnect.js`**

```js
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
```

- [ ] **Step 3: Wire into `functions/index.js`**

Add:

```js
export { stravaActivityStreams } from './strava/streams.js'
export { stravaDisconnect } from './strava/disconnect.js'
```

- [ ] **Step 4: Run all functions tests**

Run: `cd functions && npx vitest run`
Expected: PASS (tokens + normalize suites, 6 tests total).

- [ ] **Step 5: Commit**

```bash
git add functions/strava/streams.js functions/strava/disconnect.js functions/index.js
git commit -m "feat(strava): on-demand streams and disconnect callables"
```

- [ ] **Step 6: Deploy + register webhook (operational, after secrets are set)**

```bash
firebase functions:secrets:set STRAVA_CLIENT_ID
firebase functions:secrets:set STRAVA_CLIENT_SECRET
firebase functions:secrets:set STRAVA_VERIFY_TOKEN
firebase deploy --only functions,firestore:rules
```

Then register the webhook once (replace placeholders):

```bash
curl -X POST https://www.strava.com/api/v3/push_subscriptions \
  -F client_id=YOUR_CLIENT_ID \
  -F client_secret=YOUR_CLIENT_SECRET \
  -F callback_url=https://REGION-PROJECT.cloudfunctions.net/stravaWebhook \
  -F verify_token=YOUR_VERIFY_TOKEN
```

Expected: JSON `{ "id": <number> }` and Strava calls the GET handshake which returns the challenge.

---

## Task 9: Frontend — Functions export + Strava client

**Files:**
- Modify: `src/firebase.js`
- Create: `src/strava/stravaClient.js`

- [ ] **Step 1: Add Functions to `src/firebase.js`**

Add the import near the other Firebase imports:

```js
import { getFunctions } from 'firebase/functions'
```

And add this export near `export const db` / `export const auth`:

```js
export const functions = getFunctions(app)
```

- [ ] **Step 2: Create `src/strava/stravaClient.js`**

```js
import { collection, query, where, onSnapshot } from 'firebase/firestore'
import { httpsCallable } from 'firebase/functions'
import { auth, db, functions } from '../firebase'

// Public client id is safe in the bundle. Set via Vite env.
const CLIENT_ID = import.meta.env.VITE_STRAVA_CLIENT_ID
const CALLBACK_URL = import.meta.env.VITE_STRAVA_CALLBACK_URL // stravaCallback function URL

// Build the Strava authorize URL. We pass the Firebase ID token as `state`
// so the callback can identify the athlete server-side.
export async function buildStravaAuthorizeUrl() {
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
  return onSnapshot(q, snap => {
    const items = snap.docs
      .map(d => ({ id: d.id, ...d.data() }))
      .sort((a, b) => (b.startDate?.seconds || 0) - (a.startDate?.seconds || 0))
    callback(items)
  })
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
```

- [ ] **Step 3: Commit**

```bash
git add src/firebase.js src/strava/stravaClient.js
git commit -m "feat(strava): frontend functions export and strava client"
```

---

## Task 10: Frontend — Connect button + status

**Files:**
- Create: `src/strava/StravaConnectButton.jsx`

- [ ] **Step 1: Implement `src/strava/StravaConnectButton.jsx`**

```jsx
import { useEffect, useState } from 'react'
import { doc, onSnapshot } from 'firebase/firestore'
import { db } from '../firebase'
import { buildStravaAuthorizeUrl, disconnectStrava } from './stravaClient'

export default function StravaConnectButton({ athleteId }) {
  const [status, setStatus] = useState('loading')

  useEffect(() => {
    if (!athleteId) return
    return onSnapshot(doc(db, 'stravaConnections', athleteId), snap => {
      setStatus(snap.exists() ? (snap.data().status || 'connected') : 'none')
    }, () => setStatus('none'))
  }, [athleteId])

  async function connect() {
    const url = await buildStravaAuthorizeUrl()
    window.location.href = url
  }

  async function disconnect() {
    await disconnectStrava()
  }

  if (status === 'loading') return <span>…</span>
  if (status === 'connected') {
    return (
      <button onClick={disconnect} className="text-sm underline">
        Disconnect Strava
      </button>
    )
  }
  return (
    <button onClick={connect} className="rounded bg-[#FC4C02] px-3 py-1.5 text-white text-sm">
      {status === 'disconnected' ? 'Reconnect Strava' : 'Connect Strava'}
    </button>
  )
}
```

> Style note: match the app's existing button components if it has a shared
> `Button` primitive — check `src/components` and swap the raw `<button>` for it
> during implementation. The `#FC4C02` is Strava's brand orange.

- [ ] **Step 2: Commit**

```bash
git add src/strava/StravaConnectButton.jsx
git commit -m "feat(strava): connect/disconnect button with live status"
```

---

## Task 11: Frontend — Completed activities list + on-demand HR chart

**Files:**
- Create: `src/strava/CompletedActivities.jsx`

- [ ] **Step 1: Implement `src/strava/CompletedActivities.jsx`**

```jsx
import { useEffect, useState } from 'react'
import { Line } from 'react-chartjs-2'
import {
  Chart, LineElement, PointElement, LinearScale, CategoryScale, Tooltip,
} from 'chart.js'
import { subscribeCompletedActivities, fetchActivityStreams } from './stravaClient'

Chart.register(LineElement, PointElement, LinearScale, CategoryScale, Tooltip)

export default function CompletedActivities({ athleteId }) {
  const [activities, setActivities] = useState([])
  const [openId, setOpenId] = useState(null)
  const [hr, setHr] = useState(null)
  const [loadingHr, setLoadingHr] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => subscribeCompletedActivities(athleteId, setActivities), [athleteId])

  async function showHr(activity) {
    setOpenId(activity.id)
    setHr(null); setError(''); setLoadingHr(true)
    try {
      const streams = await fetchActivityStreams(athleteId, activity.stravaActivityId)
      setHr({
        time: streams.time?.data || [],
        heartrate: streams.heartrate?.data || [],
      })
    } catch {
      setError('Could not load HR — the athlete may need to reconnect Strava.')
    } finally {
      setLoadingHr(false)
    }
  }

  return (
    <div className="space-y-3">
      {activities.length === 0 && <p className="text-sm text-gray-500">No imported activities yet.</p>}
      {activities.map(a => (
        <div key={a.id} className="rounded border p-3">
          <div className="flex items-center justify-between">
            <div>
              <div className="font-medium">{a.name || a.type}</div>
              <div className="text-xs text-gray-500">
                {a.type} · {(a.distance / 1000).toFixed(1)} km ·{' '}
                {Math.round((a.movingTime || 0) / 60)} min
                {a.averageHeartrate ? ` · avg ${Math.round(a.averageHeartrate)} bpm` : ''}
              </div>
            </div>
            <button onClick={() => showHr(a)} className="text-sm underline">Show HR</button>
          </div>
          {openId === a.id && (
            <div className="mt-3">
              {loadingHr && <p className="text-sm">Loading HR…</p>}
              {error && <p className="text-sm text-red-600">{error}</p>}
              {hr && hr.heartrate.length > 0 && (
                <Line
                  data={{
                    labels: hr.time,
                    datasets: [{
                      label: 'HR (bpm)', data: hr.heartrate,
                      borderColor: '#FC4C02', pointRadius: 0, borderWidth: 1.5,
                    }],
                  }}
                  options={{
                    animation: false,
                    scales: { x: { display: false } },
                    plugins: { legend: { display: false } },
                  }}
                />
              )}
              {hr && hr.heartrate.length === 0 && (
                <p className="text-sm text-gray-500">No HR data recorded for this activity.</p>
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/strava/CompletedActivities.jsx
git commit -m "feat(strava): completed activities list with on-demand HR chart"
```

---

## Task 12: Wire UI into the app + handle return redirect

**Files:**
- Modify: the athlete-context view where the coach sees a selected athlete (locate during implementation — likely under `src/App/` or `src/components/`).

- [ ] **Step 1: Locate the mount point**

Run: `grep -rln "athleteId" src/components src/App 2>/dev/null | head`
Identify the component that renders per-athlete content (e.g. where `athleteSessions` are shown).

- [ ] **Step 2: Mount the two components**

In that component's JSX, import and render:

```jsx
import StravaConnectButton from '../strava/StravaConnectButton'
import CompletedActivities from '../strava/CompletedActivities'

// …inside the per-athlete view, where appropriate:
<StravaConnectButton athleteId={selectedAthleteId} />
<CompletedActivities athleteId={selectedAthleteId} />
```

(Use the actual variable name the component uses for the athlete id.)

- [ ] **Step 3: Surface the return toast (optional, minimal)**

Where the app reads URL params on load, detect `?strava=connected` and show a brief confirmation, then clear the param:

```js
if (new URLSearchParams(window.location.search).get('strava') === 'connected') {
  window.history.replaceState({}, '', window.location.pathname)
  // optionally trigger an existing toast/notification
}
```

- [ ] **Step 4: Build the app to verify no errors**

Run: `npm run build`
Expected: build succeeds.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat(strava): mount connect button and completed activities in athlete view"
```

---

## Task 13: Add Vite env vars + docs

**Files:**
- Modify: `.env.example`
- Modify: `README.md`

- [ ] **Step 1: Add to `.env.example`**

```
VITE_STRAVA_CLIENT_ID=
VITE_STRAVA_CALLBACK_URL=
```

- [ ] **Step 2: Add a Strava section to `README.md`**

```markdown
## Strava integration

Athletes can link Strava to auto-import completed activities. Setup:

1. Create a Strava API app (https://www.strava.com/settings/api); set the
   callback domain to your Cloud Functions host and `localhost` for dev.
2. Set Functions secrets:
   `firebase functions:secrets:set STRAVA_CLIENT_ID`
   `firebase functions:secrets:set STRAVA_CLIENT_SECRET`
   `firebase functions:secrets:set STRAVA_VERIFY_TOKEN`
3. Set frontend env: `VITE_STRAVA_CLIENT_ID`, `VITE_STRAVA_CALLBACK_URL`
   (the deployed `stravaCallback` URL).
4. `firebase deploy --only functions,firestore:rules`
5. Register the webhook once (see `docs/superpowers/plans/2026-06-03-strava-integration.md` Task 8).

Streams (HR curves) are fetched on demand and not stored.
```

- [ ] **Step 3: Commit**

```bash
git add .env.example README.md
git commit -m "docs(strava): env vars and setup instructions"
```

---

## Task 14: Analysis adapter — feed Strava activities into AnalysisDashboard

The dashboard consumes workouts grouped by week (`analysisWorkoutsByWeekKey`,
built in `src/components/AdminDashboard/derived.js`). The estimators in
`src/utils/load.js` read **`distance` as a string** (`parseDistanceValue`, e.g.
`"5.0 km"`), **duration from text fields** (`parseDurationFromText` → minutes,
e.g. `notes: "30 min"`), and **`intensityZone`** as zone numbers 1–5. Strava gives
meters/seconds and HR zones, so the adapter must convert units. Past weeks already
filter to `completed` entries, so Strava activities carrying `completed: true`
become the source of truth for past weeks; the dedup drops planned workouts that
have a matching activity.

**Files:**
- Create: `src/strava/activityToWorkout.js`
- Test: `src/strava/activityToWorkout.test.js`
- Modify: `src/components/AdminDashboard/derived.js`
- Modify: wherever `analysisWorkouts` is assembled (the hook feeding `deriveAdminState`; locate in Step 4)

- [ ] **Step 1: Write the failing test**

`src/strava/activityToWorkout.test.js`:

```js
import { describe, it, expect } from 'vitest'
import {
  stravaActivityToWorkoutShape, dominantHrZone, mergeStravaIntoAnalysis,
} from './activityToWorkout'

const activity = {
  id: 'strava_1', source: 'strava', stravaActivityId: 1,
  type: 'Run', name: 'Tempo',
  startDate: { seconds: Math.floor(new Date('2026-05-20T07:00:00Z').getTime() / 1000) },
  movingTime: 1800, distance: 5000,
  zones: [{ type: 'heartrate', distribution_buckets: [
    { min: 0, max: 120, time: 120 },
    { min: 120, max: 150, time: 200 },
    { min: 150, max: 170, time: 900 }, // dominant → bucket index 2 → zone 3
    { min: 170, max: 190, time: 100 },
  ] }],
}

describe('dominantHrZone', () => {
  it('returns the 1-based index of the bucket with the most time', () => {
    expect(dominantHrZone(activity.zones)).toBe(3)
  })
  it('returns null when no hr zones present', () => {
    expect(dominantHrZone(null)).toBeNull()
    expect(dominantHrZone([{ type: 'power', distribution_buckets: [] }])).toBeNull()
  })
})

describe('stravaActivityToWorkoutShape', () => {
  it('maps units the estimators understand', () => {
    const w = stravaActivityToWorkoutShape(activity)
    expect(w.activityTag).toBe('run')        // Run → run
    expect(w.distance).toBe('5.0 km')         // meters → "x.x km" string
    expect(w.notes).toContain('30 min')       // 1800s → 30 min text
    expect(w.intensityZone).toEqual([3])      // from dominant HR zone
    expect(w.completed).toBe(true)
    expect(w.source).toBe('strava')
    expect(w.week).toBeGreaterThan(0)         // ISO week derived from startDate
    expect(w.year).toBe(2026)
    expect(w.weekday).toBeGreaterThanOrEqual(1)
  })
})

describe('mergeStravaIntoAnalysis', () => {
  const planned = [
    { id: 'p1', activityTag: 'run', week: 20, year: 2026, weekday: 3, completed: false },
    { id: 'p2', activityTag: 'bike', week: 20, year: 2026, weekday: 5, completed: false },
  ]
  it('drops a planned workout that matches a strava activity (same week+weekday+tag)', () => {
    const stravaW = stravaActivityToWorkoutShape(activity) // run, week 21 area
    const merged = mergeStravaIntoAnalysis(planned, [
      { ...stravaW, week: 20, weekday: 3 }, // collides with p1
    ])
    const ids = merged.map(w => w.id)
    expect(ids).not.toContain('p1')   // planned run replaced by actual
    expect(ids).toContain('p2')       // unrelated planned bike kept
    expect(merged.some(w => w.source === 'strava')).toBe(true)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/strava/activityToWorkout.test.js`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `src/strava/activityToWorkout.js`**

```js
import { getWeekNumber } from '../utils/week'

// ISO-week-year for a date (can differ from calendar year near Jan 1 / Dec 31).
// Uses the same Thursday-shift as getWeekNumber so week+year stay consistent.
function isoWeekYear(date) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7))
  return d.getUTCFullYear()
}

// sport_type → app activityTag. Extend as needed.
const SPORT_TO_TAG = {
  Run: 'run', TrailRun: 'run', VirtualRun: 'run',
  Ride: 'bike', VirtualRide: 'bike', MountainBikeRide: 'bike', GravelRide: 'bike',
  Swim: 'swim',
  NordicSki: 'xc_skiing', BackcountrySki: 'xc_skiing',
  Walk: 'walking', Hike: 'walking',
}

function tagFor(sportType) {
  return SPORT_TO_TAG[sportType] || 'run'
}

// 1-based index of the HR-zone bucket with the most time, or null.
export function dominantHrZone(zones) {
  if (!Array.isArray(zones)) return null
  const hr = zones.find(z => z.type === 'heartrate')
  const buckets = hr?.distribution_buckets
  if (!Array.isArray(buckets) || buckets.length === 0) return null
  let bestIdx = 0
  for (let i = 1; i < buckets.length; i++) {
    if ((buckets[i].time || 0) > (buckets[bestIdx].time || 0)) bestIdx = i
  }
  // Clamp into the 1–5 zone space the app uses.
  return Math.min(5, bestIdx + 1)
}

export function stravaActivityToWorkoutShape(activity) {
  const seconds = activity.startDate?.seconds || 0
  const date = new Date(seconds * 1000)
  const minutes = Math.round((activity.movingTime || 0) / 60)
  const km = (activity.distance || 0) / 1000
  const zone = dominantHrZone(activity.zones)
  // JS getDay(): 0=Sun..6=Sat. App weekday: 1=Mon..7=Sun.
  const jsDay = date.getDay()
  const weekday = jsDay === 0 ? 7 : jsDay

  return {
    id: activity.id,
    source: 'strava',
    activityTag: tagFor(activity.type),
    type: 'rolig',                         // base type; intensityZone drives load
    title: activity.name || activity.type || 'Strava activity',
    distance: km > 0 ? `${km.toFixed(1)} km` : '',
    notes: minutes > 0 ? `${minutes} min` : '',
    intensityZone: zone ? [zone] : [],
    week: getWeekNumber(date),
    year: isoWeekYear(date),
    weekday,
    completed: true,
  }
}

function matchKey(w) {
  return `${w.year}-${w.week}-${w.weekday}-${w.activityTag}`
}

// Past-week source-of-truth: a Strava activity replaces a planned workout that
// matches on (year, week, weekday, activityTag). Unmatched planned workouts stay.
export function mergeStravaIntoAnalysis(plannedWorkouts, stravaWorkouts) {
  const stravaKeys = new Set(stravaWorkouts.map(matchKey))
  const keptPlanned = plannedWorkouts.filter(w => !stravaKeys.has(matchKey(w)))
  return [...keptPlanned, ...stravaWorkouts]
}
```

> Note: `getWeekNumber(date)` is the existing ISO-week helper in
> `src/utils/week.js` (verified). The dashboard keys with `getWeekKey(workout.week,
> workout.year)`, so producing `week`/`year` this way keeps imported activities in
> the same week buckets as planned workouts. `isoWeekYear` mirrors the same
> Thursday-shift `getWeekNumber` uses so the two stay consistent near year
> boundaries — do not introduce a different week algorithm.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/strava/activityToWorkout.test.js`
Expected: PASS.

- [ ] **Step 5: Wire the merge into the analysis data flow**

First locate where `analysisWorkouts` is assembled and where completed activities
are subscribed for the selected athlete:

Run: `grep -rn "analysisWorkouts\b" src` and `grep -rn "deriveAdminState" src`

In the hook that builds `analysisWorkouts` for `deriveAdminState`, subscribe to the
athlete's completed activities (reuse `subscribeCompletedActivities` from
`stravaClient.js`), map them with `stravaActivityToWorkoutShape`, and merge:

```js
import { stravaActivityToWorkoutShape, mergeStravaIntoAnalysis } from '../../strava/activityToWorkout'
// completedActivities: state from subscribeCompletedActivities(selectedAthleteId, ...)
const stravaWorkouts = completedActivities.map(stravaActivityToWorkoutShape)
const analysisWorkouts = mergeStravaIntoAnalysis(plannedAnalysisWorkouts, stravaWorkouts)
```

Leave `derived.js` itself unchanged — it just groups whatever `analysisWorkouts`
it receives. The merge happens before `deriveAdminState` is called.

- [ ] **Step 6: Build to verify no errors**

Run: `npm run build`
Expected: build succeeds.

- [ ] **Step 7: Commit**

```bash
git add src/strava/activityToWorkout.js src/strava/activityToWorkout.test.js src/components/AdminDashboard
git commit -m "feat(strava): feed imported activities into analysis (past-week source of truth)"
```

---

## Task 15: Training-validation analytics module

Builds a new analytics layer that answers "does the executed training match good
training-planning principles?" It is a **pure** module consuming the per-week
stats `computeAnalysis` already produces (`weeklyStats` with `zones`/`zoneLoads`,
`activityLoad`, `count`, etc.) plus the per-activity `zones` (HR-zone buckets) and
`laps[]` now stored on `completedActivities`. No new Strava calls.

Five validation dimensions:
- **Intensity distribution / polarization** — % of time in easy (Z1–2) vs
  threshold (Z3) vs hard (Z4–5). Classify the week as polarized / pyramidal /
  threshold-heavy and compare to an 80/20 target.
- **Threshold / VO2max work** — minutes and share of time in Z4–5; flag whether the
  block contains enough high-intensity stimulus (and not too much).
- **Speed work** — detect from lap-level pace/power variance: laps markedly faster
  than the activity average indicate intervals/strides.
- **Muscular / strength** — share of load from strength-group activity tags
  (strength, calisthenics, plyometric, crossfit, mobility, pilates, yoga — from
  `ACTIVITY_GROUP_MAP` group `strength`); flag weeks with no muscular work.
- **Specificity** — share of endurance load in the athlete's primary discipline
  (dominant `activityTag`) vs cross-training.

**Files:**
- Create: `src/strava/trainingValidation.js`
- Test: `src/strava/trainingValidation.test.js`
- Create: `src/components/AnalysisDashboard/sections/ValidationGrid.jsx`
- Modify: `src/components/AnalysisDashboard/index.jsx` (render ValidationGrid)
- Modify: `src/components/AnalysisDashboard/aggregations.js` (expose per-activity zones/laps onto weekly workouts so validation can read them) — see Step 5

- [ ] **Step 1: Write the failing test**

`src/strava/trainingValidation.test.js`:

```js
import { describe, it, expect } from 'vitest'
import {
  intensityDistribution, classifyPolarization, thresholdVo2Load,
  detectSpeedWork, muscularShare, specificityShare, validateTraining,
} from './trainingValidation'

// zoneTotals: minutes in each 1-5 zone
const zoneTotals = { 1: 200, 2: 200, 3: 40, 4: 40, 5: 20 } // 500 min total

describe('intensityDistribution', () => {
  it('buckets zone minutes into easy/threshold/hard %', () => {
    const d = intensityDistribution(zoneTotals)
    expect(d.easyPct).toBe(80)        // (200+200)/500
    expect(d.thresholdPct).toBe(8)    // 40/500
    expect(d.hardPct).toBe(12)        // (40+20)/500
  })
})

describe('classifyPolarization', () => {
  it('labels an 80/20 spread as polarized', () => {
    expect(classifyPolarization({ easyPct: 80, thresholdPct: 8, hardPct: 12 })).toBe('polarized')
  })
  it('labels heavy Z3 as threshold-heavy', () => {
    expect(classifyPolarization({ easyPct: 55, thresholdPct: 35, hardPct: 10 })).toBe('threshold')
  })
  it('labels a broad-base spread as pyramidal', () => {
    expect(classifyPolarization({ easyPct: 70, thresholdPct: 20, hardPct: 10 })).toBe('pyramidal')
  })
})

describe('thresholdVo2Load', () => {
  it('sums Z4+Z5 minutes and share', () => {
    const r = thresholdVo2Load(zoneTotals)
    expect(r.minutes).toBe(60)
    expect(r.pct).toBe(12)
  })
})

describe('detectSpeedWork', () => {
  it('flags laps clearly faster than activity average', () => {
    // speeds in m/s; lap 3 is much faster than the rest
    const laps = [
      { averageSpeed: 3.0, movingTime: 600 },
      { averageSpeed: 3.1, movingTime: 600 },
      { averageSpeed: 4.5, movingTime: 120 },
      { averageSpeed: 3.0, movingTime: 600 },
    ]
    const r = detectSpeedWork(laps)
    expect(r.hasSpeedWork).toBe(true)
    expect(r.fastLaps).toBe(1)
  })
  it('returns false when laps are uniform', () => {
    const laps = [{ averageSpeed: 3.0, movingTime: 600 }, { averageSpeed: 3.05, movingTime: 600 }]
    expect(detectSpeedWork(laps).hasSpeedWork).toBe(false)
  })
})

describe('muscularShare', () => {
  it('computes strength-group load share', () => {
    const activityLoad = { run: 800, strength: 200 }
    expect(muscularShare(activityLoad)).toBe(20)
  })
})

describe('specificityShare', () => {
  it('share of endurance load in the dominant discipline', () => {
    const activityLoad = { run: 700, bike: 200, strength: 100 }
    const r = specificityShare(activityLoad)
    expect(r.primary).toBe('run')
    expect(r.pct).toBe(78) // 700 / (700+200) endurance, rounded
  })
})

describe('validateTraining', () => {
  it('produces a dimensioned report with flags', () => {
    const weekStats = {
      zones: zoneTotals,
      activityLoad: { run: 800, strength: 0 },
      workouts: [{ source: 'strava', laps: [
        { averageSpeed: 3.0, movingTime: 600 }, { averageSpeed: 4.5, movingTime: 120 },
      ] }],
    }
    const report = validateTraining(weekStats)
    expect(report.distribution.easyPct).toBe(80)
    expect(report.polarization).toBe('polarized')
    expect(report.thresholdVo2.minutes).toBe(60)
    expect(report.speedWork.hasSpeedWork).toBe(true)
    expect(report.muscular.share).toBe(0)
    expect(report.muscular.flag).toBe('none')      // no muscular work this week
    expect(report.specificity.primary).toBe('run')
    expect(Array.isArray(report.flags)).toBe(true)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/strava/trainingValidation.test.js`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `src/strava/trainingValidation.js`**

```js
import { ACTIVITY_TAG_MAP } from '../utils/activity'

const round = n => Math.round(n)
const pct = (part, total) => (total > 0 ? round((part / total) * 100) : 0)

// % of zone-minutes in easy (Z1-2), threshold (Z3), hard (Z4-5).
export function intensityDistribution(zoneTotals) {
  const z = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, ...(zoneTotals || {}) }
  const total = z[1] + z[2] + z[3] + z[4] + z[5]
  return {
    totalMinutes: total,
    easyPct: pct(z[1] + z[2], total),
    thresholdPct: pct(z[3], total),
    hardPct: pct(z[4] + z[5], total),
  }
}

// Polarized: lots of easy + meaningful hard, little Z3.
// Threshold: Z3 dominates the quality work.
// Pyramidal: easy base, more Z3 than Z4-5.
export function classifyPolarization(dist) {
  const { easyPct, thresholdPct, hardPct } = dist
  if (thresholdPct >= 25) return 'threshold'
  if (easyPct >= 75 && hardPct >= thresholdPct) return 'polarized'
  return 'pyramidal'
}

export function thresholdVo2Load(zoneTotals) {
  const z = { 4: 0, 5: 0, ...(zoneTotals || {}) }
  const all = intensityDistribution(zoneTotals).totalMinutes
  const minutes = z[4] + z[5]
  return { minutes, pct: pct(minutes, all) }
}

// Lap-based speed-work detection: a lap whose pace is >=15% faster than the
// time-weighted average lap speed counts as a fast effort.
export function detectSpeedWork(laps) {
  const valid = (laps || []).filter(l => l.averageSpeed > 0 && l.movingTime > 0)
  if (valid.length < 2) return { hasSpeedWork: false, fastLaps: 0 }
  const totalTime = valid.reduce((s, l) => s + l.movingTime, 0)
  const avgSpeed = valid.reduce((s, l) => s + l.averageSpeed * l.movingTime, 0) / totalTime
  const fastLaps = valid.filter(l => l.averageSpeed >= avgSpeed * 1.15).length
  return { hasSpeedWork: fastLaps > 0, fastLaps }
}

const STRENGTH_TAGS = new Set(
  Object.values(ACTIVITY_TAG_MAP).filter(t => t.group === 'strength').map(t => t.value)
)

export function muscularShare(activityLoad) {
  const entries = Object.entries(activityLoad || {})
  const total = entries.reduce((s, [, v]) => s + v, 0)
  const muscular = entries.filter(([tag]) => STRENGTH_TAGS.has(tag)).reduce((s, [, v]) => s + v, 0)
  return pct(muscular, total)
}

const ENDURANCE_TAGS = new Set(
  Object.values(ACTIVITY_TAG_MAP).filter(t => t.group === 'endurance').map(t => t.value)
)

export function specificityShare(activityLoad) {
  const endurance = Object.entries(activityLoad || {}).filter(([tag]) => ENDURANCE_TAGS.has(tag))
  const total = endurance.reduce((s, [, v]) => s + v, 0)
  if (total === 0) return { primary: null, pct: 0 }
  const primary = endurance.sort((a, b) => b[1] - a[1])[0]
  return { primary: primary[0], pct: pct(primary[1], total) }
}

// Combine all dimensions for a single week's stats into a validation report.
export function validateTraining(weekStats) {
  const distribution = intensityDistribution(weekStats.zones)
  const polarization = classifyPolarization(distribution)
  const thresholdVo2 = thresholdVo2Load(weekStats.zones)

  const laps = (weekStats.workouts || []).flatMap(w => w.laps || [])
  const speedWork = detectSpeedWork(laps)

  const mShare = muscularShare(weekStats.activityLoad)
  const muscular = { share: mShare, flag: mShare === 0 ? 'none' : (mShare < 10 ? 'low' : 'ok') }

  const specificity = specificityShare(weekStats.activityLoad)

  const flags = []
  if (distribution.totalMinutes > 0 && distribution.easyPct < 70) {
    flags.push('Too little easy volume — aim for ~80% easy.')
  }
  if (thresholdVo2.minutes === 0 && distribution.totalMinutes > 0) {
    flags.push('No threshold/VO2max stimulus this week.')
  }
  if (muscular.flag === 'none') flags.push('No muscular/strength work this week.')
  if (polarization === 'threshold') flags.push('Threshold-heavy — risk of grey-zone training.')

  return { distribution, polarization, thresholdVo2, speedWork, muscular, specificity, flags }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/strava/trainingValidation.test.js`
Expected: PASS.

- [ ] **Step 5: Expose per-activity zones/laps on weekly workouts**

`validateTraining` reads `weekStats.workouts[].laps`. The analysis adapter
(Task 14) must therefore carry `laps` (and `zones`) through onto the
workout-shaped object. Update `stravaActivityToWorkoutShape` in
`src/strava/activityToWorkout.js` to also copy them:

```js
  // …inside the returned object in stravaActivityToWorkoutShape:
    laps: activity.laps || [],
    zones: activity.zones || null,
```

`buildWeekStats` in `aggregations.js` maps each workout through the estimators but
**spreads the original workout fields**; confirm the per-week `workouts` array
preserves `laps`/`zones` (it keeps the source object). If it constructs a fresh
object without spreading, add `laps: workout.laps, zones: workout.zones` to the
mapped workout so they survive into `weekStats.workouts`.

- [ ] **Step 6: Implement `ValidationGrid.jsx`**

```jsx
import { ChartCard, Stat } from './primitives'
import { validateTraining } from '../../../strava/trainingValidation'

export default function ValidationGrid({ focusWeek }) {
  if (!focusWeek) return null
  const v = validateTraining(focusWeek)
  const d = v.distribution
  return (
    <div className="validation-grid">
      <ChartCard title="Intensity distribution" caption={`Polarization: ${v.polarization}`}>
        <Stat label="Easy (Z1–2)" value={`${d.easyPct}%`} />
        <Stat label="Threshold (Z3)" value={`${d.thresholdPct}%`} />
        <Stat label="Hard (Z4–5)" value={`${d.hardPct}%`} />
      </ChartCard>
      <ChartCard title="Threshold / VO2max">
        <Stat label="Time in Z4–5" value={`${v.thresholdVo2.minutes} min`} />
        <Stat label="Share" value={`${v.thresholdVo2.pct}%`} />
      </ChartCard>
      <ChartCard title="Speed work">
        <Stat label="Detected" value={v.speedWork.hasSpeedWork ? 'Yes' : 'No'} />
        <Stat label="Fast efforts" value={v.speedWork.fastLaps} />
      </ChartCard>
      <ChartCard title="Muscular work">
        <Stat label="Strength load share" value={`${v.muscular.share}%`} />
      </ChartCard>
      <ChartCard title="Specificity">
        <Stat label="Primary discipline" value={v.specificity.primary || '—'} />
        <Stat label="In-discipline share" value={`${v.specificity.pct}%`} />
      </ChartCard>
      {v.flags.length > 0 && (
        <ChartCard title="Planning flags">
          <ul className="validation-flags">
            {v.flags.map((f, i) => <li key={i}>{f}</li>)}
          </ul>
        </ChartCard>
      )}
    </div>
  )
}
```

> Note: confirm the exact export names/props of `ChartCard` and `Stat` in
> `sections/primitives.jsx` and match them; if `Stat` takes different prop names,
> adapt. Reuse existing card styling classes rather than inventing new CSS where
> possible.

- [ ] **Step 7: Render ValidationGrid in the dashboard**

In `src/components/AnalysisDashboard/index.jsx`, import and render it below the
existing `InsightGrid`/`ChartGrid`, passing the focus week:

```jsx
import ValidationGrid from './sections/ValidationGrid'
// …in the returned JSX, after InsightGrid/ChartGrid:
<ValidationGrid focusWeek={focusWeek} />
```

(`focusWeek` is already destructured from `analysis` in `index.jsx`.)

- [ ] **Step 8: Build to verify no errors**

Run: `npm run build`
Expected: build succeeds.

- [ ] **Step 9: Run the full frontend test suite**

Run: `npx vitest run`
Expected: all tests pass (existing + new strava + validation suites).

---

## Verification (end-to-end, after deploy + secrets set)

1. `cd functions && npx vitest run` → all unit tests pass.
2. `npm run build` → frontend builds.
3. In the app, click **Connect Strava** → Strava consent → redirected back, button shows **Disconnect Strava**, `stravaConnections/{athleteId}` exists.
4. Record/upload a Strava activity → within seconds `completedActivities/strava_<id>` appears and shows in the list.
5. Click **Show HR** on an activity with HR → curve renders. Click it again →
   loads instantly from the session cache (no second Strava call; verify in
   Network tab that no new function request fires).
6. Open **AnalysisDashboard** for an athlete with an imported past-week activity →
   the activity contributes to that week's load/volume; a planned workout it
   matches (same day + activity type) is not double-counted.
7. Open **AnalysisDashboard** → the **Validation** section shows intensity
   distribution / polarization, threshold-VO2max minutes, speed-work detection,
   muscular-load share, specificity, and planning flags for the focus week.
8. Click **Disconnect Strava** → connection removed; activities remain.
