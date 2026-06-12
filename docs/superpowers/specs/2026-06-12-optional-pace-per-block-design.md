# Optional pace per block + remove duplicate warmup/cooldown

Date: 2026-06-12

## Problem

Coaches want to plan parts of a session without committing to a pace the
athlete must hit. A 20-minute warmup, an easy 3 km, intervals "by feel", and a
cooldown should be definable by **time** or **length** alone. Pace/speed should
be optional and, when not set, never shown to the athlete. An estimated
distance/duration is still kept so weekly stats stay meaningful.

Separately, sessions carry a legacy free-text `warmup`/`cooldown` (e.g.
"10-15 min easy warmup") that is auto-injected on every workout and rendered
*in addition to* the structured warmup/cooldown blocks — a visible duplicate.

## Part A — Optional pace per block

### Data model (`src/sessionBlocks/sections.js`)

- "No pace" = `paceSecPerKm` of `0`/absent. This is already the convention used
  by render code (`describeSpeed` returns null for `<= 0`). No new field for
  steady blocks.
- **Steady / warmup / cooldown** (distance domain): `paceMode` stays
  `'length' | 'time'`. Pace stored only when present (> 0).
  - `time` mode, no pace: estimate `distanceKm` from
    `durationMin` × `estimatedSpeedKmh(activityTag)` (existing helper).
  - `length` mode, no pace: estimate `durationMin` from
    `distanceKm` ÷ `estimatedSpeedKmh(activityTag)`.
  - With pace present, behaviour is unchanged.
- **Intervals**: rep-mode toggle collapses to `'length' | 'time'`; pace is
  optional and additive. `INTERVAL_PACE_MODES` becomes `['length', 'time']`.
  Migrate legacy `paceMode: 'pace'` on read → `'length'` keeping `dragKm`,
  `paceSecPerKm` (so existing interval sessions render identically). Time-mode
  interval distance already falls back to `estimatedSpeedKmh`.
- `normalizeSection` remains the single source of truth: it recomputes
  `distanceKm`/`durationMin` and only retains `paceSecPerKm` when > 0.

### Editor (`src/components/BlockSliders/`)

- `SteadySliders` (index.jsx): keep `[Time] [Length]`. Replace the always-on
  `PaceOrSpeedSlider` with a "Set pace" checkbox (off by default) that reveals
  it. Toggling off clears pace to 0.
- `IntervalSliders.jsx`: mode toggle becomes `[Length] [Time]`; add a
  "Set pace" toggle that reveals the pace/speed slider. Rep definition is by
  length or time; pace is an optional target on top.

### Athlete view (`src/components/WorkoutDetail/SessionBlocksView.jsx`)

- Already hides pace when absent. Confirm steady/cooldown/warmup rows render
  metric-only ("Warmup — 20 min", "Easy — 3 km") with no estimated second
  dimension. Intervals render "5 × 1 km" / "5 × 3 min" with `@ pace` only when
  pace is set.

## Part B — Remove duplicate free-text warmup/cooldown

Structured blocks are the single source of truth. Remove the legacy free-text
path entirely:

- Delete `getDefaultWarmup` / `getDefaultCooldown` (`src/utils/workout.js`) and
  every injection of default `warmup`/`cooldown` strings:
  `normalizeWorkout`, `App/handlers.js`, `App/WorkoutDetailModal.jsx`,
  `templateLibrary.js`, `AddFromTemplate.jsx`, `AddWorkout.jsx`,
  `AdminDashboard/{constants,templateInsertActions,templateActions,workoutActions}.js`.
- Remove warmup/cooldown textareas in `AddWorkout.jsx` and `AddFromTemplate.jsx`.
- Remove the `workout.warmup` / `workout.cooldown` render sections in
  `WorkoutDetailSections.jsx`.
- **Keep** `blocks.js` `legacy.warmup`/`legacy.cooldown` *object* migration
  (`{ distanceKm, paceSecPerKm }`) — that is structured-block back-compat, a
  different shape from the free-text string.
- Old workouts still carrying free-text strings simply stop rendering them.

## Testing

- `sections.js`: unit-test estimate fallback for steady time/length without
  pace, and interval `pace` → `length` migration.
- Run the existing suite; fix any tests that assert default warmup/cooldown
  strings.
- Verify build.
