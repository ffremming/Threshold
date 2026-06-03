# Threshold

A training planner for coaches and athletes.

## What it solves

I've been writing training plans for myself and my girlfriend for a while. The existing options are either too rigid, too expensive, or not built for how a coach actually thinks about a week. Excel works but is miserable — there's no structure for sessions, no view of load over time, and nothing nudges you when the plan stops making sense.

Threshold gives you a session bank, a calendar you can drag plans onto, and an analysis view that surfaces load and trends without a spreadsheet. It's the tool I wanted when I was the one doing the planning.

## Hosted

<https://trainingplanner-53081.web.app>

## Development

```bash
npm install
npm run dev
```

## Strava integration

Athletes can link Strava to auto-import completed activities, which feed the
Analysis dashboard (intensity distribution, threshold/VO2max, speed work,
muscular load, specificity). HR/stream data is fetched on demand and cached for
the session, never stored. Setup:

1. Create a Strava API app (<https://www.strava.com/settings/api>); set the
   authorization callback domain to your Cloud Functions host and `localhost` for dev.
2. Set Functions secrets:
   `firebase functions:secrets:set STRAVA_CLIENT_ID`
   `firebase functions:secrets:set STRAVA_CLIENT_SECRET`
   `firebase functions:secrets:set STRAVA_VERIFY_TOKEN`
3. Set frontend env (`.env`): `VITE_STRAVA_CLIENT_ID`, `VITE_STRAVA_CALLBACK_URL`
   (the deployed `stravaCallback` URL).
4. `firebase deploy --only functions,firestore:rules`
5. Register the webhook once (see `docs/superpowers/plans/2026-06-03-strava-integration.md`, Task 8).

Note: a new Strava app authenticates 1 athlete; self-service upgrade to 10 in the
API dashboard; beyond 10 requires Strava app review.

## Security

The app now uses three layers for abuse control:

- Login/register attempts are locally throttled and persist across refreshes.
- New self-registered accounts are created as `pending`; a superadmin must activate them in User administration before they can read or write training data.
- Firestore rules require an active user profile, preserve ownership fields, and block pending/disabled users from workouts, templates, tests, relationships, and athlete session banks.

For production, keep App Check enabled with `VITE_FIREBASE_APPCHECK_RECAPTCHA_KEY` and turn on App Check enforcement for Firestore in Firebase Console. The UI limiter helps normal traffic, but Firestore rules and App Check are the enforceable controls for direct API access.
