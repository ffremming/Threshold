# Time-first warmup / cooldown / continuous blocks

**Date:** 2026-05-31

## Goal

For distance activities (run / bike / swim / …), let **warmup**, **cooldown**, and
**continuous** (`steady` / "Easy session") blocks be defined by **time** rather than
distance. Length becomes a pace-derived estimate that still counts toward weekly
distance statistics. A Length/Time toggle lets the user flip back to distance-first.

## Background

These three kinds (`warmup`, `steady`, `cooldown`) currently only support
distance-first input on distance activities: the user enters `distanceKm` + pace,
and `durationMin` is computed. Strength/duration sessions already have time-only
warmup/cooldown, but those drop distance entirely (`distanceKm = 0`).

Intervals already implement exactly the pattern we want via `paceMode`
(`pace` / `length` / `time`), where `time` mode stores an `estimatedDragKm`
stats-only estimate. We mirror that for the simple blocks.

## Data model (`src/sessionBlocks/sections.js`)

Add `paceMode` of `'length'` or `'time'` to `warmup` / `steady` / `cooldown`
sections on distance activities.

- **`length` mode** — existing behavior: `distanceKm` + pace are primary,
  `durationMin` computed.
- **`time` mode** (new default for new blocks) — `durationMin` + pace are primary;
  `distanceKm` is computed = `durationMin / 60 × speed(pace)` and stored, so it
  feeds weekly distance stats.

### Changes
- `KIND_DEFAULTS` for `warmup` / `steady` / `cooldown` gain `paceMode: 'time'` and a
  `durationMin` default.
- `STEADY_PACE_MODES = ['length', 'time']` constant.
- `computeSectionDuration`: for these kinds, when `paceMode === 'time'`, duration is
  `durationMin`; otherwise `distanceKm × pace / 60` (today).
- `computeSectionDistance`: when `paceMode === 'time'`, distance is
  `durationMin / 60 × estimatedSpeedKmh-from-pace`; otherwise `distanceKm` (today).
- `normalizeSection`: for these kinds, carry `paceMode` and `durationMin`, recompute
  the derived field.

### Backward compatibility
Existing saved blocks have no `paceMode`. They default to **`'length'`** so old data
renders unchanged. Only newly created blocks default to `'time'`.

The strength/duration time-warmup path keys off `distanceKm == null`; distance-activity
blocks always keep a numeric `distanceKm`, so the two paths stay cleanly domain-separated.

## UI (`src/components/BlockSliders/index.jsx`)

`SteadySliders` gains a Length/Time mode toggle (reusing `ModeButton`), like
`IntervalSliders`:

- **Time mode:** "Duration" slider (minutes) + Pace/Speed slider. Totals show
  `Distance (est.)`.
- **Length mode:** existing "Length" slider + Pace/Speed slider.

Strength/duration warmup/cooldown still route to `DurationSliders`, untouched.

## Out of scope (YAGNI)
- No manual length-typing field (estimate is pace-derived).
- No migration of existing data.
- Strength/duration paths untouched.
