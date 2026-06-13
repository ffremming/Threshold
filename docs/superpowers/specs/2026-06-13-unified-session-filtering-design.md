# Unified Session Filtering

**Date:** 2026-06-13
**Status:** Approved, in implementation

## Problem

Sessions/templates are browsable on 8 surfaces. 5 have filtering, each implemented
differently: 3 separate `matchesSearch` variants (full-text vs title-only), activity
filter that is single-select in one place and multi-select in another, zone filter
present in some and missing in others, category filter in two places only. No shared
filter logic or UI. Adding a filter means editing every surface by hand, and the
plan-builder session picker — the surface coaches use most to find a suitable session
fast — has the weakest filtering (title-only search, single activity).

## Goal

One shared filtering engine + one shared filter UI, reused on every surface. Add
richer filters (zones, types, activities, duration, training-category) consistently.
Make the **plan-builder session picker** (`BankPickerWindow`) excellent for finding
the right session fast.

## Architecture — three layers

```
src/utils/sessionFilters.js         pure: criteria shape + applyFilters(items, criteria, opts)
src/utils/sessionFilters.test.js
src/utils/sessionCategory.js        pure: dominant training-quality categories for a session
src/utils/sessionCategory.test.js
src/hooks/useSessionFilters.js      state: criteria + setters + filtered + filtersActive + clearAll
src/components/ui/SessionFilterBar/  UI: composable filter rows driven by the hook
```

### Layer 1 — `sessionFilters.js` (pure)

Criteria object (all optional; absent/empty = inactive):

```js
{
  search: '',            // full-text string
  activities: [],        // activityTag values (multi, OR)
  zones: [],             // 1..5 (multi, OR; session matches if any of its zones is selected)
  types: [],             // 'interval' | 'continuous' (migrated type, multi, OR)
  categories: [],        // training-quality: 'threshold'|'vo2max'|'speed'|'endurance'|'strength'|'muscular_endurance' (multi, OR)
  duration: null,        // { min: number|null, max: number|null } in minutes, inclusive
  templateCategory: 'All', // 'All' | 'Easy' | 'Hard' (legacy template category)
}
```

Each filter is an independent predicate. `applyFilters(items, criteria, opts)` ANDs all
**active** predicates (within a multi-select field the values are ORed). Inactive fields
are skipped so a default/empty criteria returns everything.

- **search** — full-text over title, description, sessionDetails, notes, category, type,
  activityTag, the activity label, and tags. Single canonical implementation (replaces all
  3 duplicated `matchesSearch`).
- **activities** — `activities.includes(item.activityTag)`.
- **zones** — uses `normalizeIntensityZones(type, intensityZone)`; match if intersection non-empty.
- **types** — `types.includes(migrateWorkoutType(item.type))`.
- **categories** — uses `sessionCategories(item, opts)` (Layer 1b); match if intersection non-empty.
- **duration** — uses `sessionDuration(item)`; `min <= d` and `d <= max` for the bounds present.
- **templateCategory** — `'All' || item.category === templateCategory`.

`opts` carries `{ resolveMuscles }` so category scoring can be injected/memoized by the caller.

### Layer 1b — `sessionCategory.js` (pure)

`sessionCategories(workout, opts)` → array of the training qualities a session meaningfully
trains. Calls the existing `scoreSession(workout, opts)`, reads its `dims` object, and returns
every quality whose dose is ≥ `CATEGORY_SHARE` (0.25) of the session's max-quality dose
(so a Z4 session surfaces as both `threshold` and `vo2max`; a strength session as `strength`).
`sessionPrimaryCategory` → the single argmax quality (for any single-label display need).
Uses the existing `QUALITIES`, `QUALITY_LABELS`, `QUALITY_COLORS` from dimensions/constants.
"Tempo" is not a separate category — Z3-dominant sessions read as **Threshold**, matching every
other dimensions surface in the app.

### Layer 2 — `useSessionFilters(items, { enabled, resolveMuscles })`

Owns criteria state. `enabled` is the set of filter keys a surface wants
(e.g. `['search','activities','zones','types','categories','duration']` for the picker,
`['search']` for a minimal swap-modal). Returns:

```js
{ criteria, set: { search, activities, zones, types, categories, duration, templateCategory },
  filtered, filtersActive, clearAll }
```

`filtered` is a `useMemo` over `applyFilters`. Category scoring is memoized per item id so
typing in search does not re-score sessions. `enabled` also gates which predicates run.

### Layer 3 — `SessionFilterBar`

Built on existing ui primitives (`Toolbar`, `ToolbarGroup`, `SearchBox`, `Chip`, `SportPicker`,
`Button`). Renders only the rows in `enabled`, each row a small focused component:
`SearchRow`, `ActivityRow`, `ZoneRow`, `TypeRow`, `CategoryRow` (training-quality, colored chips),
`DurationRow` (min/max presets + custom), `TemplateCategoryRow`. Shows a result count and a
"Clear filter" button when `filtersActive`. Driven entirely by the hook's `criteria` + `set`.

## Surfaces & rollout

Priority order — picker first:

1. **BankPickerWindow** (plan-builder picker) — replace its 3 local filter states + local
   `filteredTemplates` with the hook + `SessionFilterBar`. Enable all filters. Keep its
   drag-and-drop card grid and the existing activity-visibility (+/- show/hide) behavior,
   which composes with the activity filter. This is the surface that must feel fast.
2. **LibraryBrowser** — replace `FilterBar` + local states with the hook + `SessionFilterBar`.
   Enable search, activities, templateCategory, zones, types, categories, duration.
3. **OktbankTab** — same hook; enable search, activities, templateCategory, zones, categories.
4. **TemplatePickerModal**, **BankPickerModal** — adopt the shared search predicate; optionally
   enable a compact set (search + activities). No regressions to their modal layout.
5. **AthleteSessionPool** — currently unfiltered; add a compact `SessionFilterBar` (search + activities).

`WeekOverview` and `WorkoutList` are date-organized read-only views, out of scope (not browse/find surfaces).

## Testing (TDD)

- `sessionFilters.test.js` — each predicate in isolation + combined; empty criteria returns all;
  zone/category intersection semantics; duration bounds; search field coverage.
- `sessionCategory.test.js` — fixtures: easy Z1-2 → endurance; threshold Z3 → threshold;
  interval Z5 → vo2max(+speed); strength → strength; share-threshold multi-category case.
- `BankPickerWindow.test.jsx` — extend: filtering by zone/type/category/duration narrows the
  rendered cards; clear resets.
- Existing tests for each surface must keep passing (or be updated where the UI markup changes).

## Out of scope / YAGNI

- No persistence of filter state across sessions/navigation.
- No saved filter presets.
- No new fields on the data model — everything derives from existing fields.
- No changes to date-organized views (WeekOverview, WorkoutList).
