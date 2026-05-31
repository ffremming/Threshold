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

## Security

The app now uses three layers for abuse control:

- Login/register attempts are locally throttled and persist across refreshes.
- New self-registered accounts are created as `pending`; a superadmin must activate them in User administration before they can read or write training data.
- Firestore rules require an active user profile, preserve ownership fields, and block pending/disabled users from workouts, templates, tests, relationships, and athlete session banks.

For production, keep App Check enabled with `VITE_FIREBASE_APPCHECK_RECAPTCHA_KEY` and turn on App Check enforcement for Firestore in Firebase Console. The UI limiter helps normal traffic, but Firestore rules and App Check are the enforceable controls for direct API access.
