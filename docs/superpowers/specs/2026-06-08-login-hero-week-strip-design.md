# Design: Login hero "week strip" — showcase training planning

Date: 2026-06-08
Status: Draft — awaiting user review

## Overview

First-time visitors to Threshold currently land on the full-screen `Login`
(`src/components/Login.jsx`), whose left hero column ends with an **abstract**
animated graphic (`HeroGraphic`): rotating rings, a 3×3 dot grid, two generic
floating "cards", and a tilted accent block. None of it depicts what the product
actually does.

This change replaces that abstract composition with a **miniature week strip**
that visually shows the app's core loop — laying sessions onto a week — using the
app's own semantic intensity-zone colors. The goal is graphical content that
*shows* training planning simplified, not marketing copy.

Scope is intentionally narrow: only the `HeroGraphic` function in
`Login.jsx` and the `.th-hero-*` block in `Login.css` change. No new files, no
copy changes, no structural/layout changes, no changes to the sign-in card,
footer, responsive shell, or auth logic.

### Decisions (from brainstorming)

- **Audience framing:** both coaches and athletes, default persona is the
  self-coached athlete. The graphic is audience-neutral — it shows a planned
  week, which is the shared artifact for all three.
- **No marketing copy** — graphical content only. Hero headline / tagline /
  section label are left untouched.
- **Option A — miniature week strip** (chosen over a single session card or a
  drag-onto-calendar loop).
- **Motion: calm one-shot.** Entrance choreography only, then rests static.
- **Cell content: zone-colored chips + labels** (Z2, Z4…), some days empty,
  taller chip = longer session.

## Visual design

The graphic is a single composed panel (replacing the free-floating elements),
sitting in the existing `.th-login-marks` container — therefore still hidden
below 960px, exactly as today (`@media (min-width: 960px) { .th-login-marks
{ display: block } }`). The headline, gradient bar, tagline, and section label
remain the visible content on small screens.

```
┌─────────────────────────────────────────────┐
│  WEEK 18                          42 km  ▲    │  header: week label + total + delta
│                                               │
│   MON   TUE   WED   THU   FRI   SAT   SUN     │  day labels (mono, muted)
│  ┌───┐ ┌───┐ ┌───┐ ┌───┐ ┌───┐ ┌───┐ ┌───┐    │
│  │▓▓▓│ │   │ │▓▓▓│ │▓▓▓│ │   │ │▓▓▓│ │▓▓▓│    │  day cells; filled = zone chip
│  │ Z2│ │   │ │▓▓▓│ │ Z1│ │   │ │ Z3│ │ Z5│    │  chip height ∝ session length
│  └───┘ └───┘ │ Z4│ └───┘ └───┘ └───┘ └───┘    │  (Wed has a taller Z4 chip)
│              └───┘                            │
│  ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓░░░░░░░░░  weekly load     │  load bar, fills on mount
└─────────────────────────────────────────────┘
```

### Composition

- **Panel:** a single card using the existing surface treatment
  (`background: var(--th-surface)`, `border: 1px solid var(--th-line)`,
  `border-radius: var(--th-radius-2xl)`, `box-shadow: var(--th-shadow-lg)`),
  filling the `22rem`-tall `.th-hero-graphic` box. Keeps the calm,
  surface-on-bg aesthetic of the right-hand sign-in card.
- **Header row:** `WEEK 18` in mono micro-label (`--th-font-mono`,
  `--th-text-2xs`, `--th-tracking-label`, `--th-ink-muted`) on the left;
  `42 km` in display numerals (`--th-font-display`, tabular-nums) with a small
  accent-colored `▲` delta on the right (`--th-accent`).
- **Day row:** 7 equal columns. Each column: a mono day label (`MON`…`SUN`,
  muted) above a fixed-height **day cell**. Empty cells are a faint dashed/tinted
  placeholder (`color-mix(--th-ink 8%)`); filled cells contain a **zone chip**.
- **Zone chip:** rounded rect filled with the day's zone color, a `Z2`-style
  tag in a contrasting ink, height proportional to session length (e.g. Wed's
  long Z4 ≈ 1.6× a normal chip). Colors come **only** from the semantic tokens
  `--th-zone-1 … --th-zone-5` (defined in `src/styles/tokens.css`). These are
  data-meaningful, never recolored.
- **Load bar:** full-width slim track (`--th-surface-2`) with a gradient fill
  (`--th-gradient-h`) at ~70%, labeled `weekly load` in a mono micro-label.

### Sample week (static data)

A small const array drives the render so it reads as a real, sensible week —
an easy/hard alternation a coach would actually write:

| Day | Zone | Rel. length |
|-----|------|-------------|
| Mon | Z2   | 1.0 (easy)  |
| Tue | —    | rest        |
| Wed | Z4   | 1.6 (long, key session) |
| Thu | Z1   | 0.8 (recovery) |
| Fri | —    | rest        |
| Sat | Z3   | 1.2         |
| Sun | Z5   | 1.0 (short, hard) |

Two rest days, one long key Z4 session, a Z5 sharpener — a believable week, not
random noise.

## Motion (calm one-shot)

Reuse existing variants from `src/components/ui/motion.js`; easing stays
`[0.16, 1, 0.3, 1]`.

1. The panel + header fade/lift in via `fadeInUp` (already the hero's idiom).
2. Day cells stagger in left→right using a `stagger`/`staggerFast` container so
   chips appear to "land" on the week one after another.
3. The load bar fills from 0→70% once (`width` or `scaleX` transition), timed to
   complete just after the last chip lands.
4. Then everything **rests** — no `repeat: Infinity`, no float, no pulse. This
   matches the "calm one-shot" decision and the overall Login calm.

`prefers-reduced-motion`: respect it — when set, render the final composed state
with no entrance animation (skip the stagger/fill, show 70% bar immediately).

## Implementation notes

- **`Login.jsx`** — rewrite only the `HeroGraphic()` function (currently
  `src/components/Login.jsx:213-248`). It already lives inside
  `.th-login-marks`; keep that wrapper and the `aria-hidden="true"` on the
  decorative graphic so screen readers skip it (it's illustrative, the real
  pitch is the headline/tagline text). Drive the render from the sample-week
  const. Use `m.*` (framer-motion) with the imported variants.
- **`Login.css`** — replace the `.th-hero-*` rule block
  (`src/components/Login.css:316-436`) with `.th-hero-week*` rules for the panel,
  header, day grid, cells, chips, and load bar. Remove the now-unused
  `.th-hero-ring`, `.th-hero-dots`, `.th-hero-card*`, `.th-hero-block` rules.
  All colors via `--th-*` / `--th-zone-*` tokens — no hard-coded hex.
- Update the file-top comment in `Login.css` (lines 6–7) so the "Animated hero
  graphic: rotating ring, floating cards, dot grid" line describes the week
  strip instead.
- No change to imports beyond what's already pulled from `./ui` and
  `framer-motion`.

## Testing / verification

This is a presentational change with no logic.

- `npm run build` compiles cleanly.
- Existing suite still green (`npx vitest run` — nothing in scope touches tested
  code; `WorkoutList.test.jsx` etc. unaffected).
- Manual check in `npm run dev`: hero shows the week strip at ≥960px, animates
  once and rests, is hidden <960px, and `prefers-reduced-motion` shows the
  static composed state. Verify zone chip colors match `--th-zone-1..5`.

## Out of scope

- Any hero copy / headline / tagline / section-label change.
- The sign-in / sign-up card, footer, glows, and shell layout.
- Mobile presentation of the graphic (stays hidden, as today).
- A separate landing route or page.
