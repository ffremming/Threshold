# Auto-capture scheduled sessions into the athlete's session bank

**Date:** 2026-05-31
**Status:** Approved design, ready for planning

## Goal

When a coach schedules a workout for an athlete (creates a `workouts`
document), the session is also captured into that athlete's session bank
(`athleteSessions`), deduplicated by content fingerprint. The bank holds each
unique session **once**; the scheduled workout stores a **pointer**
(`athleteSessionId`) back to the bank entry.

This means an athlete's bank gradually fills with every distinct session
they've been given, with no duplicates, and each scheduled workout knows which
bank session it corresponds to.

## Terminology

The codebase has three stores; this feature touches two:

- **`workouts`** — actual scheduled sessions on an athlete's calendar (dates,
  completion). The trigger.
- **`athleteSessions`** — per-athlete session bank, scoped by
  `coachId + athleteId`, no scheduling. This IS "the athlete's templates" for
  the purpose of this feature. The target.
- **`templates`** (per-coach) and `globalTemplates` — out of scope.

## Behaviour

### Trigger
A session is "added to an athlete" when a coach **schedules it on the
calendar**, via either of the two direct scheduling paths:

- `addWorkoutToWeek` — `src/components/AdminDashboard/workoutActions.js:20`
  (custom-form add)
- `handleAddTemplateToDay` —
  `src/components/AdminDashboard/templateInsertActions.js:76` (add from
  bank/library onto a day)

Out of scope (confirmed): the replace-session branch in
`handleAddFromTemplate`, and the template-preview-into-custom-form path (which
does not itself create a scheduled workout — the eventual `handleAddCustom`
calls `addWorkoutToWeek`, which is already covered).

### Dedup key — content fingerprint
Two sessions are "the same" when their content fields match. We compute a
stable string fingerprint from these fields (the same set
`stripSessionFields` picks):

`title, type, activityTag, intensityZone (sorted), loadTag, category,
description, sessionDetails, warmup, cooldown, notes, exercises, rest,
distance, blocks (normalized)`.

Normalization rules:
- Strings: `trim()`; do **not** lowercase content fields (a coach may
  intentionally capitalize). Trimming handles trailing-whitespace noise.
- `intensityZone`: coerce to array, sort, join — order-independent.
- `blocks`: run through `normalizeBlocks(blocks, activityTag)` (already
  imported in `athleteSessions.js`) then stable-serialize.
- The fingerprint is a deterministic JSON serialization of the normalized
  field map. We store it verbatim as a `fingerprint` field on each
  `athleteSessions` doc (string). No cryptographic hashing required — the
  serialized string is the key. (If length becomes a concern later we can hash
  it, but Firestore string fields are fine here.)

### Upsert logic
New function `ensureAthleteSessionInBank(coachId, athleteId, sessionFields)`:

1. `fields = stripSessionFields(sessionFields)`; `fp = sessionFingerprint(fields)`.
2. Query `athleteSessions` where
   `coachId == coachId AND athleteId == athleteId AND fingerprint == fp`.
   Equality-only query → no composite index needed.
3. **Found** → return existing doc id (the pointer). No write.
4. **Not found** → `addDoc` a bank entry: `{ coachId, athleteId,
   sourceBankId: null, fingerprint: fp, ...fields, createdAt, updatedAt }`,
   wrapped in `withDatabaseWriteLimit('athlete-sessions', ...)`. Return new id.

### Pointer
The scheduled `workouts` doc gets a new field `athleteSessionId` (string)
pointing at the bank entry. Workouts created before this feature simply lack
the field.

### Failure handling — fail soft
The workout schedule is the source of truth and must always succeed. The bank
capture is best-effort:

- Run the bank upsert in a way that a failure (rate limit, permission,
  transient) is caught, `console.error`-logged, and does **not** block, alert,
  or roll back the workout write.
- Consequence: a workout may end up without `athleteSessionId` if the bank
  upsert failed. That's acceptable; the calendar is unaffected.
- Because capture is best-effort and non-atomic, do not use a single batch
  spanning the workout and the bank doc.

## Data flow

```
Coach schedules session
  → compute final session fields (existing logic, unchanged)
  → write workouts doc            (source of truth, must succeed)
  → ensureAthleteSessionInBank(coachId, athleteId, fields)   [best-effort]
       query (coachId, athleteId, fingerprint)
         found?  → existing id     (POINTER, no duplicate)
         missing → addDoc bank entry → id   (STORE)
  → set workouts.athleteSessionId = id        [best-effort, separate update]
```

For `handleAddTemplateToDay` (which already uses a `writeBatch` for ordering),
the workout is created in the batch as today; the bank upsert and the
`athleteSessionId` back-write happen after `batch.commit()` succeeds.

## Files to change

| File | Change |
|------|--------|
| `src/athleteSessions.js` | Add `sessionFingerprint(fields)` and `ensureAthleteSessionInBank(coachId, athleteId, fields)`. Store `fingerprint` on new bank docs (also in existing `addAthleteSession*` writers for consistency). |
| `src/components/AdminDashboard/workoutActions.js` | Thread `coachId` into ctx; after creating the workout, call `ensureAthleteSessionInBank` and set `athleteSessionId` (fail soft). |
| `src/components/AdminDashboard/templateInsertActions.js` | Thread `coachId` into ctx; after `batch.commit()` in `handleAddTemplateToDay`, capture to bank + back-write pointer (fail soft). |
| `src/components/AdminDashboard/useAdminActions.js` | Pass `coachId` (= `userProfile.uid`) into both ctx objects. |

No Firestore rules change: coach create/read on `athleteSessions` is already
allowed, and `fingerprint` is ordinary data. No composite index: the lookup is
equality-only.

## Testing

The project has no test framework. We add **Vitest** (Vite-native) and
unit-test the pure `sessionFingerprint` helper:

- Identical content → identical fingerprint.
- `intensityZone` order does not change the fingerprint.
- Trailing/leading whitespace does not change the fingerprint.
- Differing `title`/`type`/`blocks` → different fingerprint.

Add `"test": "vitest run"` (and `"test:watch": "vitest"`) to `package.json`
scripts and `vitest` as a dev dependency. The fingerprint helper must be
importable without pulling in the Firebase SDK (keep it a pure function with no
Firestore imports at module top, or factor it so the test imports only the pure
part).

Manual verification after implementation: schedule the same session twice for
one athlete → exactly one new bank entry, both workouts carry the same
`athleteSessionId`; schedule a different session → a second bank entry.

## Decisions / non-goals

- Dedup is scoped per `coachId + athleteId`, matching existing bank semantics.
- Editing a scheduled workout later does **not** retro-update or fork the bank
  entry. The bank captures the session as scheduled. (Revisit later if needed.)
- No migration of historical workouts into the bank. Feature applies going
  forward only.
