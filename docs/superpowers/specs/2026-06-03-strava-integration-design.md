# Strava Integration — Auto-Import Completed Activities

**Date:** 2026-06-03
**Status:** Design approved, pending spec review

## Goal

Let athletes link their Strava account once, after which their completed
activities (runs, rides, swims, etc.) flow into Threshold automatically and
appear in a per-athlete **completed activities** log. This is the "actual" side
of training, kept separate from the "planned" sessions for now — planned-vs-actual
matching is explicitly out of scope for phase 1.

Imported activities also **feed the existing AnalysisDashboard**: for past weeks
they become the source of truth for load/volume/zone analysis (the dashboard
already filters past weeks to `completed` entries), while planned workouts still
drive the current and future weeks.

Heart-rate and other per-sample streams are **fetched on demand** (live from
Strava when a coach opens an activity), not stored. Within a single browser
session, any stream already fetched is served from an in-memory cache so the same
data is **never requested from Strava twice per session**.

Testing-results integration (deriving test-like performance metrics from
activities) is **out of scope for phase 1**, but the data model captures the
fields a later phase would need (per-lap power/pace, HR, zones) so nothing must be
re-imported.

## Constraints & key facts

- The app is a client-side React + Vite + Firebase app with **no backend today**.
- Strava OAuth requires a `client_secret` to exchange and refresh tokens. This
  secret must never reach the browser bundle → it lives in Cloud Functions only.
- Continuous auto-import needs a public endpoint to receive Strava push events
  (webhooks) → Cloud Functions.
- Firebase is on the **Blaze** plan, so Cloud Functions are available.
- Strava access tokens expire every **6 hours**; refresh tokens are long-lived.
- Strava rate limits (default): ~**100 requests / 15 min**, **1,000 / day**.

## Architecture

```
Athlete clicks "Connect Strava"
   → browser redirects to Strava authorize URL (client_id, scope, redirect_uri)
   → Strava redirects back to Cloud Function `stravaCallback`
        - exchanges code → access + refresh token (uses client_secret)
        - writes tokens to stravaConnections/{athleteId}
   → app shows "Connected"

New / updated activity on Strava
   → Strava POSTs event to Cloud Function `stravaWebhook`
        - acks 200 immediately (must respond < 2s or Strava retries)
        - looks up athlete by stravaAthleteId, refreshes token if expired
        - GET /activities/{id} (+ activity zones)
        - writes summary + laps + zones to completedActivities/strava_<id>
   → React app (onSnapshot) shows it in the athlete's completed log

Coach opens an activity, clicks "Show HR"
   → React calls Function `stravaActivityStreams(activityId, keys)`
        - loads tokens, refreshes if expired
        - GET /activities/{id}/streams?keys=heartrate,time,distance
        - optionally slices streams by laps[] boundaries
        - returns arrays to browser → Chart.js plots; nothing persisted
```

## Cloud Functions (4)

| Function | Trigger | Holds secret | Purpose |
|---|---|---|---|
| `stravaCallback` | HTTPS (Strava redirect) | yes | OAuth code → token exchange, store connection |
| `stravaWebhook` | HTTPS (Strava push) | yes (refresh) | GET handshake verification + POST event handling → import activity summary |
| `stravaActivityStreams` | HTTPS callable (from app) | yes (refresh) | On-demand fetch of HR/other streams; optional per-lap slicing |
| `stravaDisconnect` | HTTPS callable (from app) | — | Deauthorize, mark connection disconnected, delete tokens |

The authorize URL itself can be built client-side (it needs only the public
`client_id` and `redirect_uri`), so no dedicated `stravaConnect` function is
required.

## Data model

### `stravaConnections/{athleteId}` (doc id = athleteId)

| field | type | notes |
|---|---|---|
| athleteId | string | doc id |
| coachId | string | denormalized for access rules |
| stravaAthleteId | number | Strava's user id — used to resolve webhook events |
| accessToken | string | written/read by Functions only |
| refreshToken | string | written/read by Functions only |
| expiresAt | number | epoch seconds; refresh when `now >= expiresAt` |
| scope | string | granted scopes |
| status | string | `connected` \| `disconnected` |
| connectedAt | timestamp | |

### `completedActivities/{activityId}` (doc id = `strava_<activity.id>`)

| field | type | notes |
|---|---|---|
| athleteId | string | mirrors workouts ownership |
| coachId | string | mirrors workouts ownership |
| source | string | `"strava"` |
| stravaActivityId | number | |
| name | string | |
| type | string | Run / Ride / Swim … (`sport_type`) |
| startDate | timestamp | |
| movingTime | number | seconds |
| elapsedTime | number | seconds |
| distance | number | meters |
| totalElevation | number | meters |
| averageHeartrate | number? | if `has_heartrate` |
| maxHeartrate | number? | |
| averageWatts | number? | |
| laps | array | trimmed lap objects: index, distance, movingTime, startDate, avg cadence/watts/speed |
| zones | map? | from Activity Zones endpoint: HR + power time-in-zone distribution |
| raw | map | trimmed summary payload for later use |
| importedAt | timestamp | |

Stored as its own collection (not merged into `workouts`) to keep planned and
actual cleanly separated and to make later planned-vs-actual matching additive.

## What Strava provides (reference)

- **DetailedActivity:** distance, moving/elapsed time, elevation, avg/max speed,
  avg cadence, avg/max/weighted watts, kilojoules, calories, suffer_score,
  `has_heartrate`, `laps[]`, `splits_metric[]`, `segment_efforts[]`, device name.
- **Activity Streams** (`GET /activities/{id}/streams`): per-sample series —
  `heartrate`, `watts`, `cadence`, `velocity_smooth`, `time`, `distance`,
  `altitude`, `grade_smooth`, `latlng`, `temp`, `moving`. ~1s resolution when the
  device recorded densely. The aligned `time` stream lets us slice any stream by
  lap start/elapsed time.
- **Activity Zones** (`GET /activities/{id}/zones`): HR-zone and power-zone
  time-in-zone distribution.

## Analysis integration

The existing `AnalysisDashboard` (`src/components/AnalysisDashboard`) consumes
`workoutsByWeekKey` (planned workouts grouped by ISO week) and runs
`computeAnalysis` over fields like `activityTag`, `type`, `intensityZone`,
`weekday`, `completed`, plus estimators (`estimateWorkoutLoad`,
`getWorkoutDistance`, `normalizeIntensityZones`). For **past weeks** it already
filters to `completed` entries (`aggregations.js`).

Strava activities feed this pipeline via a pure adapter rather than a parallel
analysis path:

- `stravaActivityToWorkoutShape(activity)` maps a `completedActivities` doc into
  the shape `computeAnalysis` expects:
  - `activityTag` ← mapped from Strava `sport_type` (Run→run, Ride→bike, Swim→swim,
    else a sensible default; mapping table lives in the adapter).
  - `type` / `intensityZone` ← derived from the stored `zones` (time-in-HR-zone)
    so zone-based analysis works for imported activities; if zones are absent the
    activity contributes to load/volume but not zone breakdown.
  - duration/distance ← `movingTime` / `distance` (the estimators read these).
  - `weekday`, week key ← derived from `startDate`.
  - `completed: true` ← so past-week filtering keeps them.
  - `source: 'strava'` ← preserved for dedup and display.
- **Source-of-truth rule (past weeks):** for a past week, Strava activities are the
  truth. Planned workouts that have a matching activity (same day + compatible
  `activityTag`) are dropped from analysis to avoid double-counting; planned
  workouts with no matching activity remain (a planned-but-not-done session still
  shows as planned). Current and future weeks use planned workouts unchanged.
- The merge happens at the mount point that owns `workoutsByWeekKey`; the
  dashboard component and `computeAnalysis` are **not modified** — they just
  receive a merged map.

## Session stream cache

`stravaActivityStreams` calls are memoized in-memory in the frontend client for
the lifetime of the browser session, keyed by `activityId` (+ stream keys). A
second "Show HR" on the same activity reads the cache; the same data is **never
requested from Strava twice in one session**. A page reload clears the cache.
This is distinct from the optional persistent lazy-cache (phase 2) and is required
from the start.

## Security

- `client_secret` and Strava `verify_token` live only in Functions config
  (env / `functions:config`), never in the Vite bundle.
- `stravaCallback` and `stravaWebhook` are public HTTPS (Strava calls them
  unauthenticated). The webhook validates Strava's `verify_token` on the GET
  handshake and only writes data keyed to a known `stravaAthleteId`.
- `stravaActivityStreams` and `stravaDisconnect` are **authenticated callables**
  — they verify the Firebase ID token and that the caller may access the athlete
  (reuse `canAccessAthlete` logic).
- Firestore rules:
  - `completedActivities`: read if `canAccessAthlete(resource.data.athleteId)`;
    **client writes denied** (only the Admin SDK in Functions writes, bypassing
    rules) so activities can't be forged.
  - `stravaConnections`: read by owner/coach only; **no client writes**.

## Token refresh

Each Function that calls Strava checks `expiresAt` before the request and, if
expired, refreshes via the refresh token and updates the stored connection. No
scheduled job. A failed refresh (athlete revoked access) sets
`status = "disconnected"` and the UI surfaces a "Reconnect Strava" prompt.

## Rate limits, athlete capacity & on-demand streams

**Cost:** The Strava API is free — no credits, no per-call billing. Access is
gated by approval and rate limits, not money. Firebase Cloud Functions (Blaze)
cost is negligible for this workload (well within the free invocation tier).

**Rate limits (per application, verified 2026-06):**
- Default read (non-upload): **100 / 15 min**, **1,000 / day**.
- Default overall: **200 / 15 min**, **2,000 / day**.
- After leaving single-player mode: read **200 / 15 min**, **2,000 / day**.

**Athlete capacity — the key gotcha:** a new Strava app authenticates **1 athlete
(yourself)** by default; self-service upgrade to **10 athletes** via the API
Settings dashboard; **beyond 10 requires submitting the app for Strava review**
(human approval, brand-guideline + agreement check — has lead time). Fine for the
initial coach+athletes group; plan ahead before scaling past 10 linked accounts.

**Call budget:**
- Import path: 1–2 calls/activity (detail + zones) — far within limits.
- Stream fetches: 1 call per first "Show HR" per activity per session
  (session cache prevents repeats). A coach browsing many activities in a 15-min
  burst could approach the read limit → handled by the session cache now and the
  persistent lazy-cache later.
- Strava returns HTTP `429` with `X-RateLimit-Limit`/`X-RateLimit-Usage` headers
  when exceeded; graceful back-off is a phase-2 robustness add.
- Persistent lazy-cache (phase 2): first fetch also writes the stream to a
  `completedActivities/{id}/streams` subcollection; later sessions read it before
  calling Strava. Additive, no rework.
- Bulk backfill of historical activities (if added later) must throttle to respect
  100/15min.

## Error handling

- `stravaWebhook` acks `200` immediately, then does fetch/write asynchronously so
  Strava doesn't retry on slow imports.
- Unknown `stravaAthleteId` in a webhook event → log and drop (don't error).
- `stravaActivityStreams` returns a typed error the UI can show ("couldn't load HR
  — try reconnecting Strava") on refresh failure.

## Testing

- **Pure functions, unit-tested with Vitest:** token-refresh decision
  (`needsRefresh(expiresAt, now)`), activity-summary normalization mapper
  (Strava payload → `completedActivities` doc), per-lap stream slicer.
- **Handlers:** OAuth callback and webhook tested with mocked Strava HTTP
  responses (no live API in tests).

## Out of scope (phase 1)

- Planned-vs-actual matching / linking activities to scheduled sessions.
- Storing streams persistently (fetch-on-demand only; session cache is in-memory).
- **Testing-results integration** — deriving test-like performance metrics (best
  5/10/20-min power or pace, estimated thresholds, max HR) from activities, and
  surfacing them in `TestingDashboard`. The `completedActivities` model already
  captures the source fields (`laps[]` with per-lap power/speed, `averageWatts`,
  `averageHeartrate`, `zones`), so a later phase can mine them without re-importing.
- Historical bulk backfill.
- Non-Strava sources (Garmin, Polar, manual upload).

## Open setup steps (operational, not code)

- Create a Strava API application to obtain `client_id` / `client_secret` and set
  the OAuth `redirect_uri` to the `stravaCallback` URL.
- Register the webhook subscription with Strava (one-time POST) pointing at
  `stravaWebhook`, using the chosen `verify_token`.
