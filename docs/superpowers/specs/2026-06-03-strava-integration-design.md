# Strava Integration — Auto-Import Completed Activities

**Date:** 2026-06-03
**Status:** Design approved, pending spec review

## Goal

Let athletes link their Strava account once, after which their completed
activities (runs, rides, swims, etc.) flow into Threshold automatically and
appear in a per-athlete **completed activities** log. This is the "actual" side
of training, kept separate from the "planned" sessions for now — planned-vs-actual
matching is explicitly out of scope for phase 1.

Heart-rate and other per-sample streams are **fetched on demand** (live from
Strava when a coach opens an activity), not stored.

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

## Rate limits & on-demand streams

- Import path uses 1–2 calls/activity (detail + zones), well within limits for a
  coach with a handful of athletes.
- Stream fetches are live per "Show HR" view. Acceptable for phase 1. If repeat
  views become common, add a **lazy cache** (phase 2): first fetch also writes the
  stream to a `completedActivities/{id}/streams` subcollection; later views check
  the cache before calling Strava. Additive, no rework.
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
- Storing streams persistently (fetch-on-demand only).
- Historical bulk backfill.
- Non-Strava sources (Garmin, Polar, manual upload).

## Open setup steps (operational, not code)

- Create a Strava API application to obtain `client_id` / `client_secret` and set
  the OAuth `redirect_uri` to the `stravaCallback` URL.
- Register the webhook subscription with Strava (one-time POST) pointing at
  `stravaWebhook`, using the chosen `verify_token`.
