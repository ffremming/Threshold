import { describe, it, expect, vi } from 'vitest'
import { render, fireEvent, act } from '@testing-library/react'
import '@testing-library/jest-dom'
import PlanAnnotations from './PlanAnnotations'

// Week starting Mon 2026-06-08.
const MONDAY = new Date(2026, 5, 8)

const BANDS = [
  { id: 'b1', type: 'buildup', startDate: '2026-06-08', endDate: '2026-06-14' },
  { id: 'b2', type: 'vo2max', startDate: '2026-06-10', endDate: '2026-06-12' },
  // Outside this week — must not render.
  { id: 'b3', type: 'taper', startDate: '2026-06-20', endDate: '2026-06-25' },
]
const GOALS = [
  { id: 'g1', name: 'Oslo 10k', date: '2026-06-13', priority: 'A', sport: 'run' },
  { id: 'g2', name: 'Next month', date: '2026-07-01', priority: 'B' },
]
const NOTES = [
  { id: 'n1', body: 'Easy week', anchor: { kind: 'range', startDate: '2026-06-09', endDate: '2026-06-11' }, offset: { dx: 0, dy: 0 }, color: '#fde68a' },
  { id: 'n2', body: 'On session', anchor: { kind: 'session', sessionId: 's1' }, offset: { dx: 0, dy: 0 } },
]
const SESSIONS = [{ id: 's1', weekday: 4 }]

function renderAnn(overrides = {}) {
  const onEditBand = vi.fn()
  const onEditGoal = vi.fn()
  const onEditNote = vi.fn()
  const onMoveNote = vi.fn()
  const utils = render(
    <PlanAnnotations
      weekMonday={MONDAY}
      bands={BANDS}
      goals={GOALS}
      notes={NOTES}
      sessions={SESSIONS}
      view="month"
      today="2026-06-10"
      onEditBand={onEditBand}
      onEditGoal={onEditGoal}
      onEditNote={onEditNote}
      onMoveNote={onMoveNote}
      {...overrides}
    />
  )
  return { ...utils, onEditBand, onEditGoal, onEditNote, onMoveNote }
}

describe('PlanAnnotations rendering', () => {
  it('renders only the bands that intersect this week', () => {
    const { container } = renderAnn()
    const pills = container.querySelectorAll('.pb-band-pill')
    expect(pills).toHaveLength(2) // b1, b2 — not b3
    expect(container.textContent).toContain('Buildup')
    expect(container.textContent).toContain('VO2max focus')
    expect(container.textContent).not.toContain('Taper')
  })

  it('packs overlapping bands onto different lanes', () => {
    const { container } = renderAnn()
    const tops = [...container.querySelectorAll('.pb-band-pill')].map(p => p.style.top)
    // b1 (full week) and b2 (mid-week) overlap → distinct top offsets.
    expect(new Set(tops).size).toBe(2)
  })

  it('renders only goals on a day within this week, with priority weight', () => {
    const { container } = renderAnn()
    const markers = container.querySelectorAll('.pb-goal-marker')
    expect(markers).toHaveLength(1) // g1 in-week; g2 next month
    expect(markers[0].className).toContain('pb-goal-marker--p1') // priority A
    expect(container.textContent).toContain('Oslo 10k')
  })

  it('renders range and session anchored notes', () => {
    const { container } = renderAnn()
    expect(container.querySelectorAll('.pb-postit')).toHaveLength(2)
    expect(container.textContent).toContain('Easy week')
    expect(container.textContent).toContain('On session')
  })

  it('skips a session-anchored note whose session is absent this week', () => {
    const { container } = renderAnn({ sessions: [] })
    expect(container.querySelectorAll('.pb-postit')).toHaveLength(1) // only the range note
  })

  it('clicking a band calls onEditBand', () => {
    const { container, onEditBand } = renderAnn()
    fireEvent.click(container.querySelector('.pb-band-pill-body'))
    expect(onEditBand).toHaveBeenCalledTimes(1)
  })

  it('clicking a goal calls onEditGoal', () => {
    const { container, onEditGoal } = renderAnn()
    fireEvent.click(container.querySelector('.pb-goal-marker'))
    expect(onEditGoal).toHaveBeenCalledTimes(1)
  })

  it('clicking a note (no drag) opens the editor; dragging nudges the offset', () => {
    const { container, onEditNote, onMoveNote } = renderAnn()
    const postit = container.querySelector('.pb-postit')

    // jsdom's synthetic PointerEvent drops clientX/Y and button, so dispatch a
    // plain Event with the fields attached (handlers read them directly).
    const down = (x, y) => act(() => {
      const ev = new Event('pointerdown', { bubbles: true })
      ev.button = 0; ev.clientX = x; ev.clientY = y
      postit.dispatchEvent(ev)
    })
    const winEvt = (type, x, y) => act(() => {
      const ev = new Event(type)
      ev.clientX = x; ev.clientY = y
      window.dispatchEvent(ev)
    })

    // Plain click (down then up, no movement) → edit.
    down(10, 10)
    winEvt('pointerup', 10, 10)
    expect(onEditNote).toHaveBeenCalledTimes(1)
    expect(onMoveNote).not.toHaveBeenCalled()

    // Drag (down, move >3px, up) → move.
    down(10, 10)
    winEvt('pointermove', 40, 30)
    winEvt('pointerup', 40, 30)
    expect(onMoveNote).toHaveBeenCalledTimes(1)
    const [, offset] = onMoveNote.mock.calls[0]
    expect(offset.dx).toBe(30)
    expect(offset.dy).toBe(20)
  })

  it('shows a countdown in week view only', () => {
    const { container } = renderAnn({ view: 'week' })
    // g1 is 2026-06-13, today 2026-06-10 → -3d.
    expect(container.textContent).toContain('-3d')
  })

  it('shows a "new" dot on a note with an unread message from the other author', () => {
    const notes = [{
      id: 'nu', anchor: { kind: 'range', startDate: '2026-06-09', endDate: '2026-06-09' },
      offset: { dx: 0, dy: 0 }, readState: { coach: 1 },
      messages: [{ id: 'm', author: 'athlete', body: 'hey coach', createdAt: 100 }],
    }]
    const { container } = renderAnn({ notes, viewer: 'coach' })
    expect(container.querySelector('.pb-postit-dot')).not.toBeNull()
  })

  it('hides the dot for the author of the latest message', () => {
    const notes = [{
      id: 'nu', anchor: { kind: 'range', startDate: '2026-06-09', endDate: '2026-06-09' },
      offset: { dx: 0, dy: 0 }, readState: {},
      messages: [{ id: 'm', author: 'coach', body: 'mine', createdAt: 100 }],
    }]
    const { container } = renderAnn({ notes, viewer: 'coach' })
    expect(container.querySelector('.pb-postit-dot')).toBeNull()
  })

  it('renders resize handles on a band, only on its real (non-open) edges', () => {
    // b1 spans the whole week (Mon..Sun) → both edges are real, two handles.
    // A band that continues past the right edge shows no end handle.
    const onResizeBandHandle = vi.fn()
    const { container } = renderAnn({ onResizeBandHandle, bands: [
      { id: 'full', type: 'buildup', startDate: '2026-06-08', endDate: '2026-06-14' },
      { id: 'openRight', type: 'taper', startDate: '2026-06-12', endDate: '2026-06-20' },
    ] })
    const pills = [...container.querySelectorAll('.pb-band-pill')]
    const full = pills.find(p => p.querySelector('.pb-band-handle--start'))
    expect(full.querySelectorAll('.pb-band-handle')).toHaveLength(2)
    const open = pills.find(p => p.classList.contains('is-open-right'))
    expect(open.querySelector('.pb-band-handle--end')).toBeNull()
    expect(open.querySelector('.pb-band-handle--start')).not.toBeNull()
  })

  it('pressing a resize handle calls onResizeBandHandle with the band and edge', () => {
    const onResizeBandHandle = vi.fn()
    const { container } = renderAnn({ onResizeBandHandle, bands: [
      { id: 'full', type: 'buildup', startDate: '2026-06-08', endDate: '2026-06-14' },
    ] })
    const endHandle = container.querySelector('.pb-band-handle--end')
    fireEvent.pointerDown(endHandle)
    expect(onResizeBandHandle).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'full' }), 'end', expect.anything(),
    )
  })

  it('shows a draw hint on an empty band strip and starts a draw on press', () => {
    const onDrawBand = vi.fn()
    const { container } = renderAnn({ onDrawBand, bands: [] })
    expect(container.querySelector('.pb-band-draw-hint')).not.toBeNull()
    const track = container.querySelector('.pb-band-track')
    // Press on the empty strip → onDrawBand(event). The gesture hook resolves the
    // anchor day from the event against the day cells; here we only assert the
    // strip forwards the pointer-down event to start a draw.
    fireEvent.pointerDown(track, { button: 0, clientX: 0, clientY: 0 })
    expect(onDrawBand).toHaveBeenCalledTimes(1)
    expect(onDrawBand.mock.calls[0][0]).toBeInstanceOf(Object) // the pointer event
  })

  it('renders a live band ghost from bandPreview, clipped to this week', () => {
    const { container } = renderAnn({
      bandPreview: { drawing: true, startDate: '2026-06-09', endDate: '2026-06-11' },
    })
    const ghost = container.querySelector('.pb-band-ghost')
    expect(ghost).not.toBeNull()
    expect(ghost.classList.contains('is-drawing')).toBe(true)
    // Tue..Thu → starts at col 1. Gap-aware: one column-width + one 4px gap in.
    expect(ghost.style.left).toMatch(/calc\(/)
    expect(ghost.style.left).toContain('4px')
    expect(ghost.style.left).toContain('100%')
  })

  it('renders a live range highlight with a right-click hint when a range is selected', () => {
    const { container } = renderAnn({ selectedRange: { startDate: '2026-06-09', endDate: '2026-06-11' } })
    const hl = container.querySelector('.pb-range-highlight')
    expect(hl).not.toBeNull()
    expect(hl.textContent).toMatch(/Right-click/)
    // Spans Tue..Thu → starts at col 1. Gap-aware calc, not a flat percentage.
    expect(hl.style.left).toMatch(/calc\(/)
    expect(hl.style.left).toContain('4px')
  })
})
