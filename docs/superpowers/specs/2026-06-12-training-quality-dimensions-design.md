# Training Quality Dimensions — Design

**Date:** 2026-06-12
**Status:** Approved for implementation
**Author:** Ferdinand + Claude (brainstorming session)

## Purpose

Threshold already measures training in terms of **load, distance, intensity, and duration**. This feature adds a second, orthogonal lens: **what kind of training quality** a plan delivers, across five physiological dimensions:

> **Strength · Endurance · VO2max · Speed · Threshold**

Each dimension is scored **0–100 per week** so a coach can answer, for any point in a plan, "this week is 81/100 threshold, 34/100 VO2max, 40/100 speed, 25/100 strength, 72/100 endurance" — and watch those numbers build or recede week over week. Every session also gets a single **Load** number derived from all its parts.

The scores are computed **from the plan itself**, so editing a plan immediately shows how it shifts each quality.

## Scope

In scope:
- A pure scoring engine (new `src/utils/dimensions/` module) that turns sessions → per-quality stimulus + a unified session Load.
- Per-week aggregation of the five qualities (0–100, fixed reference dose).
- A **week-plan widget**: radar + horizontal bars of the five qualities, shown on the week-plan page.
- The **session Load** number + quality-breakdown bar, shown in the expanded session-card detail.
- An **analysis chart** with two toggleable over-time views: **Weekly stimulus** and **Buildup (rolling accumulation with decay)**.
- A **muscle heatmap** (body chart colored by how often each muscle is worked), shown on the week-plan page *when the week contains strength work*, and in the analysis view (over the selected window).

Out of scope (noted as easy future adds):
- Echoing the radar+bars into the analysis view as a clicked-week detail.
- User-editable reference doses / time constants (ship with sensible defaults; constants centralized for easy tuning).
- Stacked-area "training mix" view (we chose multi-line; stacked could be added later).

## Non-negotiable design decisions (from brainstorming)

1. **Two-level model.** Per-session **stimulus** doses feed per-week scores. A second **buildup** view accumulates weekly stimulus with decay. The per-week stimulus view itself carries nothing forward — each week is independent.
2. **Per-block physiological scoring**, with **graceful fallback** to a zone-weighted estimate when a session has no structured blocks. Nothing scores zero by accident.
3. **Fixed reference dose = 100.** 100 is an athlete-independent "full" weekly dose per quality, anchored to coaching norms. Same plan → same scores, comparable across athletes and weeks.
4. **Strength uses a saturation model**, not linear tonnage. Per-muscle sets saturate; muscle coverage saturates. Plus a body-chart heatmap of muscles worked over time.
5. **Per-session Load** is derived from all blocks and shown in the **expanded card detail** (not as a loud header badge).
6. **Week-plan widget = radar + horizontal bars side by side.**
7. **Analysis = two toggleable views:** Weekly stimulus (bars) + Buildup (smooth decay curves), shared legend, one toggle.
8. **Muscle heatmap:** week-plan page only if the week has strength; always available in analysis (windowed).

---

## The scoring engine

New module: `src/utils/dimensions/` (pure functions, unit-tested, matching the `src/utils/` convention). Re-exported via `src/utils/index.js`.

### Dimension keys

```js
export const QUALITIES = ['strength', 'endurance', 'vo2max', 'speed', 'threshold']
```

Colors reuse existing tokens: threshold `#2563eb`, endurance `#10b981`, vo2max `#f97316`, speed `#8b5cf6`, strength `#ec4899`.

### Per-session → per-quality dose + load

`scoreSession(workout) → { load: number, dims: { strength, endurance, vo2max, speed, threshold } }`

The engine has two fidelity levels selected per session:

**A. Structured (session has `blocks.sections`)** — per-block physiology.
For each section, compute its work minutes (existing `computeSectionWorkMinutes`) and map to quality doses by section kind + intensity:

- **warmup / cooldown** → endurance (low weight), Zone 1.
- **steady** → primarily endurance/threshold depending on the section's zone (Z1–2 endurance, Z3 threshold, Z4 threshold+vo2max).
- **interval** (work reps) → vo2max + threshold, weighted by zone and rep length: longer reps (≥3 min) favor vo2max; threshold-pace reps favor threshold.
- **effort** (duration-only hard work) → vo2max/threshold by intensity.
- **sprint** → speed (dominant) + a little vo2max; short maximal reps.
- **interval rest** → excluded from quality dose (matches existing zone-minute logic).
- **exercise** (strength) → strength via the saturation model below; also contributes muscle-coverage data.

**B. Text-only (no blocks)** — zone-weighted fallback.
Derive estimated duration (existing `estimateWorkoutDuration`), the normalized intensity zone(s), and `activityTag`. Apply a fixed zone→quality weighting table over the estimated minutes. Strength-group activities route to the strength model using a duration proxy (see below).

Both levels feed the **same** quality accumulators, so structured sessions are just sharper.

### Session Load

`load = Σ over blocks (blockLoad)`, where each block's load is consistent with the existing `estimateWorkoutLoad` philosophy (duration × intensity factor) for cardio blocks, and a scaled strength contribution for exercise blocks. The result is comparable across cardio and strength. The session-card detail shows this number plus a bar splitting it by quality share.

> Implementation note: we keep the existing `estimateWorkoutLoad`/`estimateMechanicalLoad` for backward compatibility, and add `scoreSession` as the richer per-block computation. Weekly totals migrate to the new engine; existing callers can be migrated incrementally.

### Strength saturation model

Strength does not use HR zones. It is scored from **sets per muscle**, with strong diminishing returns, then combined across muscles (coverage also saturating).

**Per-muscle set saturation** — fitted to the user's anchors (3 sets→50, 6→80, 9→90):

```
muscleScore(sets) = 100 × (1 − e^(−0.25 × sets))
```

Verified values: 1→22, 2→39, **3→53**, 4→63, 5→71, **6→78**, 7→83, 8→86, **9→89**, 10→92, 12→95, 15→98. (Matches the user's 50/80/90 intuition closely.)

**Per-session strength dose** — for each muscle worked in the session, sum its sets (across all exercises hitting that muscle), apply `muscleScore`. Combine the per-muscle scores with a **coverage saturation** so that working ~4–6 muscle groups already scores well and you do not need to hit all 17:

```
strengthDose = saturate( mean_or_sum of per-muscle scores, coverageHalfSat )
```

Exact combiner: average the per-muscle saturated scores, then scale by a coverage factor `nMusclesWorked / (nMusclesWorked + k)` (k chosen so ~4 muscles ≈ 0.7, ~8 ≈ 0.8). Final value normalized to 0–100 against the strength reference dose. Constants centralized in `dimensions/constants.js` for tuning.

**Text-only strength fallback:** when a strength session has no `loadKg`/structured sets, use a duration proxy (strength minutes × fixed factor) so it still contributes, flagged internally as low-fidelity.

**Muscle vocabulary:** reuse `src/strength/muscles.js` — `DATASET_MUSCLES` (17), `DATASET_TO_HIGHLIGHTER` mapping, `MUSCLE_LABELS`. The engine emits a `musclesWorked: { [muscle]: sets }` map per session for the heatmap.

### Per-week aggregation

`scoreWeek(workouts) → { dims: {…0–100}, load, musclesWorked: {…}, perSession: [...] }`

Sum session doses per quality, then normalize each by its **reference dose** (the weekly amount that = 100), clamped to [0, 100]:

```
weekScore[q] = clamp(100 × rawWeeklyDose[q] / REFERENCE_DOSE[q], 0, 100)
```

**Reference doses** (defaults, literature-informed, in `constants.js`, tunable):
| Quality | 100 ≈ | Rationale |
|---|---|---|
| Threshold | ~3–4 quality threshold sessions/wk | Standard high-but-sustainable threshold block |
| VO2max | ~2 hard interval sessions/wk | VO2max work is potent in small doses |
| Endurance | weekly aerobic volume target | Base volume |
| Speed | regular sprint/strides exposure | Neuromuscular touches |
| Strength | saturated muscle-coverage score at full-body 2×/wk | Complete strength week |

Defaults are set so a typical hard-but-sustainable week lands ~80–90, leaving headroom.

### Buildup view (rolling accumulation with decay)

For the analysis "Buildup" view only, accumulate the per-week stimulus per quality with exponential decay (Banister-style impulse response, weekly cadence):

```
capacity[q][week] = capacity[q][week−1] × decay[q] + stimulus[q][week] × gain[q]
decay[q] = e^(−1 / τ[q])
```

**Per-quality time constants τ (weeks), defaults in `constants.js`:**
| Quality | Fade | τ (weeks) |
|---|---|---|
| Speed | fast | ~2 |
| VO2max | fast | ~3 |
| Threshold | medium | ~4 |
| Endurance | slow | ~6 |
| Strength | slow | ~6–8 |

`gain[q]` normalized so a sustained reference-dose input approaches ~100. This view shows fitness cresting during a block and fading in a taper/break; fast qualities crest and drop sooner. **The Weekly-stimulus view does NOT use this** — it shows raw `weekScore[q]`.

---

## UI

### Week-plan page widget (radar + bars)

Lives on the week-plan page (`WeekOverview.jsx` area). Two halves side by side, same data:
- **Left: radar pentagon** — five axes (the five qualities), filled polygon, grid rings at 25/50/75/100. Reads "what kind of week is this" at a glance (balanced vs spiky).
- **Right: horizontal bars** — one labelled bar per quality, 0–100, exact value shown. Sorted descending or fixed order (fixed order preferred for week-to-week stability).

Built with the existing design system (Card, tokens, `th-num`). Radar as a lightweight inline SVG component (no new dep); bars as styled divs.

### Session-card Load detail

In the expanded session detail (existing `WorkoutDetailModal` / session card expansion), at the bottom:
- **Session load** label + large monospaced number.
- A thin **quality-share bar** (segments colored per quality) + a small legend showing each contributing quality's %.
- A short hint: "Load = sum of every block."
Collapsed card stays clean — no header badge.

### Analysis over-time chart (two views)

In `AnalysisDashboard`, a new panel with a **toggle** between two views of the same five series:
- **Weekly stimulus** (raw `weekScore[q]`, nothing carried forward): the per-week reading. Rendered as a **multi-line** chart (the agreed primary shape) on a 0–100 axis — each quality a line tracing its weekly stimulus. (A grouped 5-bars-per-week rendering is an acceptable alternative skin of the same data if it reads better in practice; multi-line is the default.)
- **Buildup** (decay accumulation): same five series run through the per-quality decay model; smooth cresting-then-fading curves.

Both views share: Chart.js (existing lib), legend chips that double as on/off toggles, a **"now" divider** (solid = completed weeks, dashed = planned), value dots, smoothed tension, gradient fill on the focused line, and focus-on-hover that dims the others. Reuses the existing `nowMarkerPlugin` pattern and Chart.js options conventions.

### Muscle heatmap

Reuse `src/components/Strength/MuscleMap.jsx` + `react-body-highlighter` + the `DATASET_TO_HIGHLIGHTER` mapping. Color each muscle region by **frequency/volume worked** over the relevant window (normalized → intensity ramp using zone/accent colors).
- **Week-plan page:** rendered **only if the week contains strength work** (skip the empty figure on pure-cardio weeks). Shows that week's muscle coverage.
- **Analysis view:** rendered over the selected analysis window (e.g. last 6/12 weeks), showing which muscles are consistently trained vs neglected.

---

## Architecture & data flow

```
workout(s)  ──▶  src/utils/dimensions/
                   ├─ scoreSession(workout) → { load, dims, musclesWorked }
                   │     ├─ structured: per-block physiology  (sessionBlocks/*)
                   │     └─ text-only: zone-weighted fallback (utils/load, utils/intensity)
                   ├─ scoreWeek(workouts)   → { dims(0–100), load, musclesWorked, perSession }
                   ├─ buildupSeries(weeklyStimulus[]) → decay-accumulated series
                   └─ constants.js (QUALITIES, REFERENCE_DOSE, TAU, saturation k's, colors)
                         │
         ┌───────────────┼───────────────────────────┐
         ▼               ▼                           ▼
  WeekPlan widget   Session-card Load detail   AnalysisDashboard
  (radar + bars)    (load + quality bar)       (2 views + heatmap)
  + heatmap if strength                        (multi-line / buildup)
```

- **Pure logic** in `utils/dimensions/` — fully unit-tested in isolation (engine math, saturation curve anchors, reference normalization, decay series).
- **UI** consumes the engine; no business logic in components.
- **Persistence:** none new — scores are derived on the fly from existing `workouts`. (If perf requires, memoize per week; no schema change.)

### New files (approx.)
- `src/utils/dimensions/index.js` — public exports
- `src/utils/dimensions/constants.js` — QUALITIES, reference doses, τ, saturation constants, colors
- `src/utils/dimensions/scoreSession.js` — per-session engine (+ fallback)
- `src/utils/dimensions/strength.js` — saturation model + muscle aggregation
- `src/utils/dimensions/scoreWeek.js` — weekly aggregation + buildup series
- `src/utils/dimensions/*.test.js` — unit tests (anchors, fallback, normalization, decay)
- `src/components/dimensions/QualityRadar.jsx` — inline SVG radar
- `src/components/dimensions/QualityBars.jsx` — horizontal bars
- `src/components/dimensions/QualityWidget.jsx` — radar + bars composite (week-plan)
- `src/components/dimensions/SessionLoadDetail.jsx` — load + quality bar for card
- `src/components/dimensions/QualityTrendChart.jsx` — analysis 2-view chart
- `src/components/dimensions/MuscleHeatmap.jsx` — wraps MuscleMap with frequency coloring
- CSS co-located per existing convention.

### Touched files
- `src/utils/index.js` — re-export dimensions
- `src/components/AdminDashboard/WeekOverview.jsx` — mount QualityWidget (+ heatmap if strength)
- session-card detail (`WorkoutDetailModal.jsx`) — mount SessionLoadDetail
- `src/components/AnalysisDashboard/` (sections + charts) — mount QualityTrendChart + MuscleHeatmap

## Testing

- **Engine unit tests (primary):** saturation curve hits anchors (3→53, 6→78, 9→89); structured vs fallback parity for an equivalent session; reference normalization clamps to [0,100]; a no-strength week emits no muscle data and the heatmap is skipped; buildup decay produces a crest-then-fade for a block-then-taper input and respects per-quality τ ordering (speed fades before endurance).
- **Component tests:** radar/bars render the five values; session-card shows the load number; analysis toggle switches views; heatmap renders only when strength present.
- Follow existing Vitest + Testing Library conventions, co-located `*.test.js(x)`.

## Risks / open items
- **Reference-dose calibration** is judgement-based; defaults centralized and tunable. Acceptance: a few real plans score in sensible ranges (hard week ~80–90, easy/off week low).
- **Fallback fidelity** for text-only sessions is necessarily approximate; acceptable per decision #2.
- **Strength data completeness** (sets per muscle) depends on structured exercises; duration proxy covers the gap.

## Delivery
Per user: **build end-to-end, then one review.** Scoring engine built test-first; UI built on top; single review pass at the end.
