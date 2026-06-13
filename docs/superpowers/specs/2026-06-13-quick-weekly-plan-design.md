# Quick Weekly Plan — Design

**Date:** 2026-06-13
**Status:** Approved (design), pending implementation
**Scope:** A new **Plan** subpage in the plan builder where a coach sets, per ISO week, **distance** and **time** targets, an **activity distribution**, and a **quality focus** — with a **progression ramp** (build-up %, deloads, race tapers) that derives later weeks from earlier ones, and a **constraint-solver generator** that fills a selected period from the session bank to hit those targets, building around sessions already on the calendar.

## Goal

Let a coach plan a training block fast, from the month-style calendar:

1. **Per-week targets** — total **distance (km)**, total **time (min)**, an **activity distribution** (run X% / bike Y% / strength Z% …), and a **quality focus** (subset of the six training qualities). Distance & time are first-class with target-vs-actual bars; activity distribution and quality focus are first-class too. Load (TRIMP) is shown as a derived read-out, not a typed target.
2. **Progression ramp** — instead of typing every week, set a base week's volume + a **build-up rate 0–20%**; later weeks' targets are derived by ramping from the previous week. Any single week can be overridden by typing over it. The ramp **bends down** for deload/taper weeks.
3. **Period coding (bands)** — reuse the existing band system (`buildup` / `taper` / `recovery` / `raceDay` / focus bands). A week inside a deload/taper band, the weeks before an **A-race goal**, and an **every-Nth-week** cadence all reduce that week's ramped volume by a configurable fraction.
4. **Day intensity tags** — each day can be tagged **hard / easy / rest**; the generator respects them (hard sessions on hard days, easy on easy, nothing on rest).
5. **Generate over a period** — select a range of weeks, click **Generate**: a constraint solver picks real sessions from the bank and places them across each week's non-rest days to best hit that week's targets, **counting existing sessions** toward the targets and filling only the remaining gap (never deleting existing work).
6. **Per-session Replace** — each placed session on this subpage has a **Replace** button: freeze the rest of the week and re-solve that single slot for the next-best bank candidate.

## Non-goals

- **No new Firestore collection.** Everything lives on the existing per-athlete `plans/{athleteId}` doc as a new `weekTargets` array plus a `planSettings` object (ramp defaults). Generated sessions are normal `workouts/{id}` docs.
- **No destructive generate.** Generate never deletes or replaces existing sessions; it only adds to reach the remaining target. (Per-session Replace swaps one session the user explicitly targets.)
- **No solver explainability UI** beyond the target-vs-actual bars (user chose "just show the result").
- **No per-metric weight sliders.** Solver priority is fixed: **volume (distance & time) first**, then activity distribution and quality focus among the volume-reaching options.
- **No changes to the Week or Month views' behavior.** The Plan subpage is additive — a third view tab.
- **No new top-level navigation.** It's a view tab inside the existing plan builder, alongside Week / Month.

## The four interacting systems

```
weekTargets[]  (NEW)   — per-week distance/time/distribution/quality + day tags + ramp override
planSettings   (NEW)   — block-level ramp config: baseWeek, rampPct, deloadEveryN, deloadPct, taperPct
bands[]        (EXISTS) — buildup/deload/taper/recovery period coding (drives ramp bends)
goals[]        (EXISTS) — A/B/C race markers (A-race → pre-race taper bend)
```

The **ramp engine** is a pure function `deriveWeekTargets(weeks, weekTargets, planSettings, bands, goals)` that takes the explicit base + any overrides and produces a resolved distance/time target for every week in range — applying ramp-up, then deload/taper bends. The **solver** consumes those resolved targets plus the activity distribution and quality focus to place sessions.

## Data model

### `plans/{athleteId}` — new fields (merged into the existing doc)

```js
// plans/{athleteId}   (existing doc; adds weekTargets[] and planSettings{})
{
  athleteId, bands: [...], notes: [...], goals: [...],   // unchanged

  weekTargets: [{
    id: string,                       // crypto.randomUUID()
    week: number,                     // ISO week 1..53
    year: number,                     // ISO week-year
    // Volume targets. When `base` is true these are user-typed anchors; when a
    // week is ramp-derived it carries no stored distance/time (computed live).
    base: boolean,                    // true = a typed anchor the ramp starts/restarts from
    distanceKm: number | null,        // typed target (anchor or override); null = derive from ramp
    durationMin: number | null,       // typed target (anchor or override); null = derive from ramp
    // Activity distribution: tag → percentage (0..100), should sum ~100. Absent
    // tags = 0. Drives the solver's per-activity volume split.
    distribution: { [activityTag: string]: number } | null,
    // Quality focus: subset of QUALITIES the week emphasizes. Drives session
    // selection scoring. Empty/absent = no quality preference.
    qualities: string[],              // e.g. ['threshold','vo2max']
    // Per-day intensity tags. Index 1..7 (Mon..Sun) → 'hard' | 'easy' | 'rest'.
    // Absent weekday = unconstrained (solver may place either).
    dayTags: { [weekday: number]: 'hard' | 'easy' | 'rest' },
    // Manual deload flag for THIS week (composes with band/goal/cadence rules).
    deload: boolean,
    createdAt: number, updatedAt: number,
  }],

  planSettings: {
    rampPct: number,            // weekly build-up rate 0..20 (% increase per week)
    deloadEveryN: number | 0,   // recurring deload cadence (0 = off; e.g. 4 = every 4th week)
    deloadPct: number,          // deload week volume as % of ramped value (e.g. 60)
    taperPct: number,           // A-race final-week volume as % of ramped value (e.g. 40)
    taperWeeks: number,         // how many weeks before an A-race to taper (e.g. 2)
    updatedAt: number,
  } | null,                     // null = ramp off; every week is typed
}
```

Notes:
- **Timestamps** are `Date.now()` numbers set at write time (array elements can't hold `serverTimestamp()`); the doc-level `updatedAt` keeps `serverTimestamp()` — same convention as bands/notes/goals.
- **One target per (week, year).** The reducer collapses duplicates on that key.
- **`base` vs override.** A `base: true` week is where a ramp segment starts. A non-base week with a non-null `distanceKm`/`durationMin` is a manual override that the ramp respects (it does not get overwritten, and the next derived week ramps from it).
- Firestore rule: covered by the existing `plans/{athleteId}` rule (same doc, `canAccessAthlete`). No rule change needed unless field-shape validation is strict; the existing rule writes the whole doc under access control, so `weekTargets`/`planSettings` are allowed.

### Ramp derivation — `deriveWeekTargets` (pure)

`src/utils/planRamp.js` — `deriveWeekTargets(weeks, { weekTargets, planSettings, bands, goals })` → `Map<weekKey, { distanceKm, durationMin, source }>` where `source ∈ 'typed' | 'ramped' | 'deload' | 'taper'`.

Algorithm, walking `weeks` in chronological order:
1. **Seed.** Track a running `prevDistance`/`prevDuration` from the most recent resolved week. The first `base` week (or the earliest typed week) seeds it.
2. **Typed/override wins.** If a week has a non-null typed `distanceKm`/`durationMin`, use it verbatim (`source:'typed'`), and update `prev` to it.
3. **Ramp up.** Otherwise the *ramped* value = `prev × (1 + rampPct/100)` for each of distance and time (`source:'ramped'`).
4. **Bend down (deload/taper).** Determine if the week is a reduction week, in priority order:
   - **Taper:** the week is within `taperWeeks` before any **priority-A** goal's week → `ramped × taperPct/100`, stepping down linearly across the taper window (last week the lowest). `source:'taper'`.
   - **Deload (band):** the week overlaps a `recovery`- or `taper`-coded band (the reduction-phase band types in `BAND_TYPES`) → `ramped × deloadPct/100`. `source:'deload'`.
   - **Deload (cadence):** `deloadEveryN > 0` and the week's index within the block is a multiple of N → `ramped × deloadPct/100`. `source:'deload'`.
   - **Deload (manual):** the week's `weekTarget.deload === true` → `ramped × deloadPct/100`. `source:'deload'`.
   - **Resume-after-deload:** a reduction week does **not** become the base the next week ramps from — otherwise the plan would ratchet downward. The running `prev` keeps tracking the *ramped* (pre-reduction) value, so the build resumes at the right level after a deload. The reduction applies to the week's displayed/target value only.
5. `planSettings === null` ⇒ no ramp; only typed weeks have targets, others are `null` (untargeted).

Pure and unit-tested in isolation (no Firestore, no React).

## Architecture / components

```
AdminPlanBuilder/index.jsx
  VIEW_TABS += { value: 'plan', label: 'Plan' }            ← third tab
  └─ buildPanelMap(view==='plan') → <PlanGridPanel>        ← NEW calendar variant

PlanGridPanel.jsx (NEW — a sibling of MonthGridPanel, same 196px+7col grid)
  per week row:
    ├─ left 196px col: <WeekRulePanel>   ← REPLACES MonthWeekSummary on this page
    │     distance/time target inputs (or ramped read-out), distribution editor,
    │     quality-focus chips, target-vs-actual BARS, deload toggle
    ├─ band/goal annotations (reuse <PlanAnnotations>, unchanged)
    └─ 7 day cells:
          - day intensity tag control (hard/easy/rest) in the cell header
          - session chips, each with a <ReplaceSessionButton> on this page
          - "+" add affordance (unchanged)
  top toolbar: week-range selection readout + <GenerateButton>

usePlanTargets.js (NEW controller hook — sibling of usePlanAnnotations)
  owns: which week's rule editor is open, the working-copy edits, persistence via
        planActions.upsertWeekTarget / removeWeekTarget / setPlanSettings
  exposes: setTarget(week,year,patch), setDayTag(week,year,weekday,tag),
           setSettings(patch), generate(range), replaceSession(workout)

Pure utils (NEW):
  planRamp.js        deriveWeekTargets(...)         — ramp/deload/taper engine
  planRamp.test.js
  planSolver.js      solveWeek(target, opts)        — the constraint solver
  planSolver.test.js
  weekTargetTypes.js target shape consts + helpers  — default distribution, quality set

Reducers (EXTEND):
  planReducers.js    upsertWeekTarget / removeWeekTarget / setPlanSettings
                     normalizePlan += weekTargets, planSettings
usePlan.js           EMPTY_PLAN += weekTargets/planSettings; planActions += 3 actions
```

### The constraint solver — `planSolver.js`

`solveWeek(target, { existingSessions, bank, dayTags, opts })` → `{ placements: [{ session, weekday }], fit }`.

**Inputs**
- `target` — resolved `{ distanceKm, durationMin, distribution, qualities }` for the week.
- `existingSessions` — sessions already on the calendar that week (counted as fixed, with their day/weekday).
- `bank` — candidate templates (the session-bank list), pre-scored once via `sessionCategories`/`computeWeekSummary` primitives.
- `dayTags` — which weekdays are hard/easy/rest; rest days are excluded as slots.

**Objective** (lower is better) — a weighted sum of normalized deltas between the projected week (existing + chosen) and the target:
```
cost = W_dist · |projDist − target.distanceKm| / target.distanceKm
     + W_time · |projTime − target.durationMin| / target.durationMin
     + W_act  · Σ_tag |projShare_tag − target.share_tag|        (activity distribution L1)
     + W_qual · Σ_q  qualityShortfall(q)                        (focus qualities under-served)
```
With **volume-first priority** the volume weights dominate: `W_dist = W_time = 1.0`, `W_act = 0.4`, `W_qual = 0.4` (tunable constants in the module). Activity/quality only break ties among solutions that reach volume.

**Constraints**
- Place at most one bank-chosen session per empty slot per day; **rest** days take none; **hard**-tagged days prefer sessions whose dominant quality is high-intensity (threshold/vo2max/speed/strength) and **easy** days prefer endurance/recovery — encoded as a per-slot eligibility penalty, not a hard exclusion (so a week can still hit volume if the bank is thin).
- Never exceed a per-week session-count ceiling (`existing + maxAdds`, default `maxAdds = 7 − rest days − existing count`, clamped ≥ 0).

**Search** (this is approach **B**, a real solver, done tractably):
1. **Candidate pre-filter.** From `bank`, keep templates matching at least one of the target's `qualities` OR a distributed activity, scored once.
2. **Greedy seed.** Fill empty non-rest slots by repeatedly adding the single candidate that most reduces `cost` (this alone gets close).
3. **Local search.** Iterate swap/add/remove moves (replace a placed session with a different candidate; move a session to a different eligible day; drop a session if removing it lowers cost) until no single move improves `cost` or an iteration cap (e.g. 200 moves) is hit. This escapes the greedy local optimum — the "solver" behavior the user picked — while staying fast (client-side, deterministic, no async).
4. Return the placements + the final `fit` (per-metric deltas) so the bars can render.

`replaceSession(workout)` = run step 3 with every other slot frozen and `workout`'s slot opened, returning the single best different candidate.

**Generate over a period** = run `solveWeek` for each selected week, collect all placements as `items = [{ session, week, year, weekday }]`, and commit them in **one** `onAddManySessions(items)` batch (existing atomic write path). Existing sessions are untouched.

## Interaction flow

1. **Switch to Plan tab.** Same calendar grid; left column becomes the rule panel; day cells gain intensity-tag controls and per-session Replace buttons.
2. **Set the ramp (optional).** A small **Plan settings** control (toolbar) sets `rampPct`, `deloadEveryN`, `deloadPct`, `taperPct`, `taperWeeks`. With it on, weeks show *derived* targets (read-only italic) until typed over.
3. **Type a base week.** Enter distance/time on one week → it becomes a `base` anchor; following weeks ramp from it. Type over any later week to override (it becomes an anchor the ramp respects).
4. **Set distribution & qualities** per week via the rule panel (distribution: per-activity % using the existing `SportPicker` + numeric inputs; qualities: colored chips from `QUALITIES`/`QUALITY_COLORS`).
5. **Tag days** hard/easy/rest in the day-cell headers.
6. **Select a week range** (marquee or click first/last week) and **Generate** → solver fills each week, one batched write. Bars update from the new actuals (live `computeWeekSummary`/`scoreWeek`).
7. **Replace** a single session via its button → one slot re-solved, written via the existing single-insert/delete path (delete the old, insert the replacement) or a dedicated swap.

## Target-vs-actual bars (`WeekRulePanel`)

For each metric, a horizontal bar: the **actual** fills it, a **notch** marks the target; the bar turns the quality/activity color when within tolerance, amber when under, neutral when over.
- **Distance / time:** actual from `computeWeekSummary(weekWorkouts)` (`.totalDistance`, `.totalDuration`) vs resolved target.
- **Activity distribution:** a stacked bar of actual `activityDistance`/`activityDuration` shares vs the target distribution (ghost segments).
- **Quality focus:** the chosen qualities as chips, each with the week's 0–100 actual from `scoreWeek(weekWorkouts).dims[q]` shown as a mini-bar; non-focus qualities dimmed.
- **Load (derived):** small read-out of `computeWeekSummary().totalLoad` (Edwards TRIMP) — informational, no target.

All actuals come from the **existing** `computeWeekSummary` / `scoreWeek` — no new aggregation logic.

## Reused, unchanged pieces

| Piece | Used for |
|---|---|
| `usePlan` + `writeField` (`src/App/hooks/usePlan.js`) | persistence of `weekTargets`/`planSettings` via the generic field writer |
| `planReducers.upsertById`/`removeById` | the new `upsertWeekTarget`/`removeWeekTarget` reducers |
| `computeWeekSummary` (`src/utils/weekSummary.js`) | every actual: distance, time, per-activity, load, zones |
| `scoreWeek` / `scoreSession` (`src/utils/dimensions`) | quality actuals (0–100) and per-session quality scoring for the solver |
| `sessionCategories` (`src/utils/sessionCategory.js`) | which qualities a bank template trains (solver candidate scoring) |
| `QUALITIES` / `QUALITY_LABELS` / `QUALITY_COLORS` (`dimensions/constants.js`) | the quality-focus chips |
| `ACTIVITY_TAG_MAP` / `SportPicker` (`src/utils/activity.js`, ui) | the activity-distribution editor + icons |
| `onAddManySessions` (`templateInsertActions.js`) | the atomic batched write for Generate |
| `PlanAnnotations` (bands/goals) | period coding rendered on the Plan page too |
| `MonthGridPanel` grid/markup patterns | `PlanGridPanel` mirrors its grid, day cells, "+" affordance |
| `EditorPopover` | any popover editors (e.g. plan settings) |

## Error handling

- **No plan doc yet** → reads as empty; first target write creates it via `setDoc(merge)`.
- **Ramp with no base week** → no derived targets (everything `null`); the page prompts to type a base.
- **Thin bank** (no candidate for a needed quality/activity) → solver places the best available toward volume and the bars show the quality shortfall; it never crashes or invents sessions. (User chose bank-only, no placeholders.)
- **Distribution not summing to 100** → solver treats shares proportionally (normalizes internally); the editor shows the running total so the user can fix it.
- **Generate write failure / rate limit** → surfaces via the existing workout-write error path; the next snapshot is the source of truth, so a partial batch (atomic — all or nothing) can't half-apply.
- **Replace** of a session the user is mid-editing elsewhere → operates on the latest snapshot; last-write-wins, consistent with the rest of the plan doc.
- Geometry/derivation for out-of-range weeks returns `null`/skips rather than clamping wrongly.

## Testing (TDD)

- **`planRamp.test.js`** — ramp-up across N weeks; typed override stops/reseeds the ramp; deload by band, by cadence (`deloadEveryN`), by manual flag, by A-race taper window (linear step-down); `planSettings === null` ⇒ only typed weeks targeted; build resumes at pre-deload level after a deload.
- **`planSolver.test.js`** — empty week hits volume from the bank; existing sessions counted (solver adds only the gap); rest days get nothing; hard/easy eligibility steers placement; distribution honored among volume-reaching options; quality focus served; thin bank degrades gracefully (no crash, shortfall reported); `replaceSession` returns a different best candidate with other slots frozen; objective is volume-first (a volume-correct/quality-wrong solution beats a volume-wrong/quality-right one).
- **`planReducers` (week targets)** — `upsertWeekTarget` collapses on `(week,year)`; `removeWeekTarget`; `setPlanSettings`; `normalizePlan` includes the new fields and tolerates legacy docs.
- **`usePlanTargets`** — open/edit/persist a target; set day tag; generate calls `onAddManySessions` with the solver's items; replace calls the swap path.
- **`WeekRulePanel` render** — target-vs-actual bars show actual fill + target notch; under/over/met coloring; quality chips reflect focus set and 0–100 actuals.
- **`PlanGridPanel` render** — renders the rule panel in the left column, day-tag controls, Replace buttons; existing Month/Week tests unaffected.
- **Existing tests** for `usePlan`, `planReducers`, `MonthGridPanel` keep passing (additive changes only).

## File inventory

**New:**
- `src/utils/weekTargetTypes.js` (+ test) — target shape consts, default distribution/quality helpers.
- `src/utils/planRamp.js` (+ test) — `deriveWeekTargets` ramp/deload/taper engine.
- `src/utils/planSolver.js` (+ test) — `solveWeek` constraint solver + `replaceSession` helper.
- `src/components/AdminPlanBuilder/PlanGridPanel.jsx` — the Plan-view calendar (grid mirror of MonthGridPanel).
- `src/components/AdminPlanBuilder/WeekRulePanel.jsx` (+ test) — left-column rule editor + target-vs-actual bars.
- `src/components/AdminPlanBuilder/DistributionEditor.jsx` — per-activity % control.
- `src/components/AdminPlanBuilder/QualityFocusChips.jsx` — quality multi-select chips.
- `src/components/AdminPlanBuilder/DayIntensityTag.jsx` — hard/easy/rest control in a day cell.
- `src/components/AdminPlanBuilder/ReplaceSessionButton.jsx` — per-session replace on the Plan page.
- `src/components/AdminPlanBuilder/GenerateBar.jsx` — period selection readout + Generate + plan-settings.
- `src/components/AdminPlanBuilder/usePlanTargets.js` (+ test) — controller hook.
- `src/components/AdminPlanBuilder/styles/plan.css` — Plan-page styling (bars, chips, rule panel).

**Modified:**
- `src/utils/planReducers.js` — `upsertWeekTarget`/`removeWeekTarget`/`setPlanSettings`; extend `normalizePlan`.
- `src/App/hooks/usePlan.js` — extend `EMPTY_PLAN`; add the three actions to `planActions`.
- `src/components/AdminPlanBuilder/index.jsx` — add the `plan` view tab.
- `src/components/AdminPlanBuilder/buildPanelMap.jsx` — route `view==='plan'` to `PlanGridPanel`; thread targets/actions.
- `src/components/AdminPlanBuilder/styles/index.css` — import `plan.css`.

## Out of scope / YAGNI

- No solver weight sliders (volume-first is fixed).
- No solver reasoning panel (bars only).
- No destructive/replace-week generate.
- No move-to-different-week reshaping in v1 (generate adds within each week; existing sessions stay put).
- No per-day target granularity beyond hard/easy/rest tags.
- No persistence of the week-range selection across navigation.
