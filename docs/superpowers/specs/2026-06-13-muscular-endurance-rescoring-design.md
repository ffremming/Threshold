# Muscular endurance — "long and hard" rescoring

**Date:** 2026-06-13
**Status:** Approved, ready for implementation plan

## Problem

Muscular endurance is too easy to build. The current model rewards almost
every cardio session, so a range of unrelated sessions each push the bar up.
Three things combine to cause it:

1. The per-session dose is **quadratic in raw duration** (`ME_K · D² · …`), so a
   couple of long efforts saturate the bar far below the stated "~12 h/week"
   anchor.
2. **Every** cardio session contributes — there is no qualifying gate, so short
   and easy sessions accrue muscular endurance.
3. The reference dose (143) is low, so the weekly score clamps to 100 too
   readily.

The user's intent: muscular endurance should come from **long sessions with
intensity**. Long threshold sessions and long (2 h+) efforts contribute; the
combination of length × intensity contributes the most. **Short sessions should
contribute nothing, regardless of intensity.**

## Model

A session contributes muscular-endurance dose only if it passes **both** gates.

### 1. Real-clock duration gate

If the session's total real (clock) duration `< 75 min`, dose = **0**.

This is what makes short sessions contribute nothing even when they are very
intense — a 45-min Zone 4 interval session or a 50-min Zone 5 session is short,
so it scores zero. Length is a hard prerequisite; intensity only scales how much
a *long* session earns.

"Real clock duration" = the session's total work duration as already computed
for the session (the same minutes used elsewhere — interval rest handling stays
consistent with current `computeSectionWorkMinutes` behavior; this gate uses the
session's total, not effective minutes).

### 2. Effective-minutes computation and floor

Each section's minutes are weighted by intensity zone:

| Zone   | 1 | 2   | 3 | 4 | 5 |
|--------|---|-----|---|---|---|
| weight | 1 | 1.5 | 3 | 4 | 5 |

Warmup / cooldown sections are zone 1 (unchanged from today). Threshold (zone 3)
is the deliberate big jump — the user's "threshold minutes count ×3".

Session effective minutes:

```
E = Σ (section_minutes × zoneWeight(sectionZone))
```

Anchor check (user's own example): 30 min warmup (Z1) + 30 min Z3 →
30·1 + 30·3 = **120 effective minutes** = "2 h of muscular load". ✓

If `E < 90`, dose = **0**. Otherwise only the excess counts:

```
qualified = E − 90
```

### 3. Dose (mild super-linear)

```
dose = qualified ^ 1.3
```

The exponent > 1 makes one long effort worth more than the same effective
minutes split across several shorter (but still qualifying) sessions, without
the runaway of the old quadratic-on-raw-duration curve.

### 4. Weekly score

```
score = clamp(100 × Σ_sessions dose / 4000, 0, 100)
```

Reference dose = **4000**: roughly three genuinely long sessions per week are
needed to approach 100.

## How real sessions land

Raw per-session dose (before weekly normalization):

| Session                              | clock | E   | dose |
|--------------------------------------|-------|-----|------|
| 30 min Z3 tempo                      | 30    | 90  | 0    |
| 45 min Z4 intervals (15wu+30 Z4)     | 45    | 135 | 0    |
| 50 min Z5 hard (20wu+30 Z5)          | 50    | 170 | 0    |
| 60 min Z2 easy                       | 60    | 90  | 0    |
| 75 min Z3 tempo (15wu+60 Z3)         | 75    | 195 | 424  |
| 90 min Z2 long-ish                   | 90    | 135 | 141  |
| 2 h Z2 long                          | 120   | 180 | 347  |
| long threshold (30wu+90 Z3)          | 120   | 300 | 1044 |
| 3 h Z2 ultra                         | 180   | 270 | 855  |

Weekly raw totals → score (÷4000, clamp):

| Week                                          | raw  | score |
|-----------------------------------------------|------|-------|
| Normal week: 30 Z3 + 45 Z4 + 60 Z2            | 0    | 0     |
| One 2.5 h easy                                | 588  | ~15   |
| One long threshold                            | 1044 | ~26   |
| 2 long-threshold + one 3 h easy               | 2944 | ~74   |
| 3 long sessions (long-threshold ×2 + 3 h ×1)  | ~4000| ~100  |

Short sessions — including intense ones — contribute **zero**. Different
ordinary sessions no longer build muscular endurance; only long efforts do.

## Code changes

### `src/utils/dimensions/constants.js`
- Remove `ME_K`, `ME_INTENSITY_BASE`, `ME_INTENSITY_ZONE_SCALE`.
- Add:
  - `ME_ZONE_WEIGHTS = { 1: 1, 2: 1.5, 3: 3, 4: 4, 5: 5 }`
  - `ME_RAW_MIN_MINUTES = 75` (real-clock gate)
  - `ME_EFF_FLOOR = 90` (effective-minutes floor)
  - `ME_EXPONENT = 1.3`
- `REFERENCE_DOSE.muscular_endurance = 4000` (was 143).
- Update the muscular-endurance comment block to describe the new model.

### `src/utils/dimensions/scoreSession.js`
- Replace `meIntensityFactor` / `muscularEnduranceDose` with a function over
  effective minutes:
  ```
  muscularEnduranceDose(rawClockMin, effectiveMin):
    if rawClockMin < ME_RAW_MIN_MINUTES: return 0
    if effectiveMin < ME_EFF_FLOOR:      return 0
    return (effectiveMin - ME_EFF_FLOOR) ^ ME_EXPONENT
  ```
- In the structured path: accumulate `sessionEffMin += minutes × meZoneWeight(zone)`
  per section (zones already resolved via `sectionZone`), plus the existing
  `sessionMin` total for the raw-clock gate. Sprint sections count toward
  effective minutes at zone 5 weight (consistent with their existing zone-5
  treatment). Strength (`exercise`) sections still excluded.
- Apply the dose once per session from `(sessionMin, sessionEffMin)` instead of
  the old `muscularEnduranceDose(sessionMin, avgZone)`.
- In `scoreSessionFallback` (text-only): same — compute effective minutes from
  the estimated minutes and the normalized zone list, apply both gates.

### Tests
- `src/utils/dimensions/scoreSession.test.js`: replace the old quadratic
  anchors. Add cases asserting: short hard session (45 min Z4) → muscular
  endurance 0; short easy → 0; long threshold ≫ long easy of equal clock time;
  75-min threshold session is the first to qualify.
- `src/utils/dimensions/scoreWeek.test.js`: update the muscular-endurance anchor
  test — one long session well below 100; three long sessions ≈ 100; a normal
  mixed week ≈ 0.

## Out of scope
- No change to other dimensions (threshold, vo2max, endurance, speed, strength).
- No UI changes — the score flows through existing `QualityBars` / trend / radar
  components unchanged.
- Decay tau for muscular endurance stays at 6 weeks.
