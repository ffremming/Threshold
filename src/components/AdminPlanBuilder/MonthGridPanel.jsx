import { useEffect, useMemo, useRef, useState } from 'react'
import { Plus, X, Copy, Scissors } from 'lucide-react'
import {
  ACTIVITY_TAG_MAP, WEEKDAY_OPTIONS, groupWorkoutsByWeekday,
  normalizeIntensityZones, getZoneBarBackground, workoutHasZones,
  formatDurationLabel, formatKmValue, ZONE_COLORS, getWeekNumber,
} from '../../utils'
import { sessionDuration, sessionDistance } from '../../utils/weekSummary'
import ActivityIcon from '../ActivityIcon'
import BuilderPanelHeader from './BuilderPanelHeader'
import { makeDropZoneProps } from './dragProps'
import { useMonthSelection, cellKey } from './useMonthSelection'
import MonthWeekSummary from './MonthWeekSummary'
import MonthGhostChip from './MonthGhostChip'
import { computeWeekSignals, computeWeekSeries } from '../../utils/loadSignals'
import { useMonthSignalsToggle } from './useMonthSignalsToggle'
import MonthWeekSignals from './MonthWeekSignals'
import { useMonthTrendsToggle } from './useMonthTrendsToggle'
import MonthTrendPanel from './MonthTrendPanel'

const DAY_FMT = new Intl.DateTimeFormat('en', { day: 'numeric', month: 'short' })

function formatRange(monday, sunday) {
  if (!monday || !sunday) return ''
  return `${DAY_FMT.format(monday)} – ${DAY_FMT.format(sunday)}`
}

function MonthChip({ workout, onSelect, onToggleSelect, onContextMenu, onRemove, drag, dropProps, isDragging, isDropTarget, isGhosting, isSelected }) {
  const tag = ACTIVITY_TAG_MAP[workout.activityTag]
  // Strength sessions have no intensity zone — show no zone accent bar.
  const zones = workoutHasZones(workout.activityTag)
    ? normalizeIntensityZones(workout.type, workout.intensityZone)
    : []
  const zoneBar = zones.length > 0 ? getZoneBarBackground(zones) : 'none'
  // Whole-chip fill: a light wash of the session's peak (highest) zone color.
  // Easy zones (1–2) share Zone 1's neutral color; only the harder zones (3–5)
  // tint the chip with their own hue.
  const peakZone = zones.length > 0 ? Math.max(...zones) : null
  const peakColor = peakZone && peakZone >= 3 ? ZONE_COLORS[peakZone]?.border : null
  const zoneFill = peakColor
    ? `color-mix(in srgb, ${peakColor} 30%, var(--th-surface))`
    : (peakZone ? (ZONE_COLORS[1]?.bg || 'var(--th-surface)') : 'var(--th-surface)')
  const draggable = Boolean(drag)
  const className = [
    'pb-month-chip',
    isDragging ? 'is-drag' : '',
    isDropTarget ? 'is-target' : '',
    isGhosting ? 'is-ghosting' : '',
    isSelected ? 'is-selected' : '',
  ].filter(Boolean).join(' ')
  return (
    <div className="pb-month-chip-wrap" data-session-id={workout.id} onContextMenu={onContextMenu} {...(dropProps || {})}>
      <button
        type="button"
        className={className}
        style={{ '--pb-zone-bar': zoneBar, '--pb-zone-fill': zoneFill }}
        onClick={event => {
          // ⌘/Ctrl+click toggles this session in the multi-selection; a plain
          // click opens the editor.
          if (event.metaKey || event.ctrlKey) {
            event.preventDefault()
            onToggleSelect?.(workout)
            return
          }
          onSelect?.(workout)
        }}
        draggable={draggable}
        onDragStart={draggable ? event => drag.onDragStart(workout, event) : undefined}
        onDragEnd={draggable ? drag.onDragEnd : undefined}
        title={workout.title || tag?.label || 'Session'}
      >
        <span className="pb-month-chip-line">
          {tag?.icon && <ActivityIcon name={tag.icon} className="pb-month-chip-icon" title={tag.label} />}
          <span className="pb-month-chip-title">{workout.title || tag?.label || 'Session'}</span>
        </span>
      </button>
      {onRemove && (
        <button
          type="button"
          className="pb-month-chip-remove"
          onClick={event => { event.stopPropagation(); onRemove(workout) }}
          draggable={false}
          aria-label={`Remove ${workout.title || 'session'}`}
          title={`Remove ${workout.title || 'session'}`}
        >
          <X aria-hidden="true" strokeWidth={2.4} />
        </button>
      )}
    </div>
  )
}

// Marquee rectangle overlay (viewport coords → positioned fixed).
function MarqueeBox({ marquee }) {
  if (!marquee) return null
  const left = Math.min(marquee.startX, marquee.curX)
  const top = Math.min(marquee.startY, marquee.curY)
  const width = Math.abs(marquee.curX - marquee.startX)
  const height = Math.abs(marquee.curY - marquee.startY)
  return <div className="pb-month-marquee" style={{ left, top, width, height }} aria-hidden="true" />
}

// Right-click context menu for a selection: Copy / Cut, positioned at the
// cursor. Choosing an item arms cursor-follow placement (handled by the hook).
function SelectionContextMenu({ menu, count, onCopy, onCut }) {
  if (!menu) return null
  return (
    <div className="pb-month-context-menu" style={{ left: menu.x, top: menu.y }} role="menu">
      <button type="button" className="pb-month-context-item" role="menuitem" onClick={onCopy}>
        <Copy aria-hidden="true" strokeWidth={2} />
        <span>Copy{count > 1 ? ` ${count} sessions` : ''}</span>
      </button>
      <button type="button" className="pb-month-context-item" role="menuitem" onClick={onCut}>
        <Scissors aria-hidden="true" strokeWidth={2} />
        <span>Cut{count > 1 ? ` ${count} sessions` : ''}</span>
      </button>
    </div>
  )
}

// Multi-week calendar grid. One row per ISO week from the overview window;
// seven day cells per row. Sessions drag across days and weeks; the week-row
// header jumps the Week view to that week. Supports Excel-style marquee
// selection of day-cells with keyboard copy/paste and multi-cell move.
export default function MonthGridPanel({
  visiblePanelIds,
  currentWeek,
  currentYear,
  overviewWeeks,
  overviewWorkoutsByWeekKey,
  selectedWeekKey,
  loadingOverview,
  dragState,
  dropTarget,
  handleDropTargetChange,
  handleDrop,
  onSelectWorkout,
  onDeleteWorkout,
  onAddSessionToDay,
  onAddManySessions,
  onMoveMany,
  onDeleteMany,
  onPlacementChange,
  modalOpen,
  onJumpToWeek,
  handleWorkoutDragStart,
  handleDragEnd,
}) {
  const gridRef = useRef(null)
  const marqueeDownRef = useRef(null) // pointerdown pos of a potential marquee drag
  // The active-week row outline starts hidden when the month view opens; it only
  // appears after the user explicitly opens a week from its label, and a click on
  // a dead spot suppresses it again.
  const [outlineSuppressed, setOutlineSuppressed] = useState(true)

  const sel = useMonthSelection({
    gridRef,
    workoutsByWeekKey: overviewWorkoutsByWeekKey,
    onAddManySessions,
    onMoveMany,
    onDeleteMany,
    modalOpen,
  })

  // Right-click context menu over a selection: { x, y } in viewport coords, or
  // null when closed.
  const [contextMenu, setContextMenu] = useState(null)

  // Open the Copy/Cut menu only when right-clicking a chip that is part of the
  // current selection. Otherwise let the browser's default menu through.
  function handleChipContextMenu(workoutId, event) {
    if (!sel.isSessionSelected(workoutId) || sel.selectedIds.size === 0) return
    event.preventDefault()
    setContextMenu({ x: event.clientX, y: event.clientY })
  }

  // Dismiss the menu on any outside pointerdown or scroll while it is open.
  useEffect(() => {
    if (!contextMenu) return
    function dismiss(event) {
      if (event.target?.closest?.('.pb-month-context-menu')) return
      setContextMenu(null)
    }
    function dismissOnScroll() { setContextMenu(null) }
    window.addEventListener('pointerdown', dismiss, true)
    window.addEventListener('scroll', dismissOnScroll, true)
    return () => {
      window.removeEventListener('pointerdown', dismiss, true)
      window.removeEventListener('scroll', dismissOnScroll, true)
    }
  }, [contextMenu])

  // The past-week boundary (completed-only filter) is keyed off today's actual
  // week, NOT the navigation cursor (currentWeek/currentYear). Navigating the
  // month view forward must not reclassify still-upcoming weeks as past and zero
  // out their planned sessions.
  const todayWeek = useMemo(() => {
    const now = new Date()
    return { week: getWeekNumber(now), year: now.getFullYear() }
  }, [])

  const { showSignals, setShowSignals } = useMonthSignalsToggle()
  const signalMap = useMemo(
    () => computeWeekSignals(overviewWeeks, overviewWorkoutsByWeekKey, currentWeek, currentYear, todayWeek.week, todayWeek.year),
    [overviewWeeks, overviewWorkoutsByWeekKey, currentWeek, currentYear, todayWeek]
  )

  const { showTrends, setShowTrends } = useMonthTrendsToggle()
  const weekSeries = useMemo(
    () => computeWeekSeries(overviewWeeks, overviewWorkoutsByWeekKey, currentWeek, currentYear, todayWeek.week, todayWeek.year),
    [overviewWeeks, overviewWorkoutsByWeekKey, currentWeek, currentYear, todayWeek]
  )

  const cellDrag = { onDragStart: handleWorkoutDragStart, onDragEnd: handleDragEnd }
  const hasClipboard = Boolean(sel.clipboard)
  const selectionCount = sel.selectedIds.size

  // Today's calendar date (local midnight), for highlighting the current day cell.
  const today = new Date()
  const todayStamp = today.getFullYear() * 10000 + today.getMonth() * 100 + today.getDate()

  // Drop on a day cell. A selection drag (dragging a selected chip) moves the
  // whole selection anchored to this cell. A single-session drag whose session
  // is part of the selection does the same. Otherwise: normal single-session /
  // template drop.
  function handleCellDrop(week, year, weekday, beforeWorkoutId) {
    if (sel.isDraggingSelection() && selectionCount > 0) {
      sel.endSelectionDrag()
      return sel.moveSelection(week, year, weekday)
    }
    const drag = dragState
    if (drag?.kind === 'workout' && selectionCount > 0 && sel.isSessionSelected(drag.workoutId)) {
      handleDragEnd()
      return sel.moveSelection(week, year, weekday)
    }
    return handleDrop(weekday, beforeWorkoutId, week, year)
  }

  // Start a marquee from anywhere in the grid — background, empty cell space, or
  // even on top of a day's "+" add button. The marquee only activates once the
  // pointer actually moves (see beginMarquee), so a plain press on "+" still adds
  // a session and a plain press on a chip still opens it. Skip only chips (which
  // own their click/drag gestures) and the week-label (which jumps to the week).
  function onGridPointerDown(event) {
    if (sel.isPlacementArmed()) return // a placement click must not start a marquee
    if (event.target.closest('.pb-month-chip-wrap, .pb-month-week-label')) return
    // Remember where a potential marquee started so the trailing click can tell a
    // real drag-select apart from a plain click on dead space.
    marqueeDownRef.current = { x: event.clientX, y: event.clientY }
    sel.beginMarquee(event)
  }

  // Clicking any non-interactive "dead" spot (panel padding, the weekday header
  // row, the week summary, a non-selected empty cell) clears the cell selection
  // and hides the active-week row outline. A click that is the tail end of a
  // marquee drag-select must NOT clear what it just selected. While a Copy/Cut
  // placement is armed, a click on a day cell places the sessions there instead.
  function onPanelClick(event) {
    const down = marqueeDownRef.current
    marqueeDownRef.current = null
    // An armed Copy/Cut placement intercepts the click before the marquee-trailing
    // logic: clicking a day places, clicking off a cell cancels.
    if (sel.isPlacementArmed()) {
      const cellEl = event.target.closest?.('.pb-month-cell')
      const hover = sel.hoverCell
      if (cellEl && hover) { sel.placeAt(hover.week, hover.year, hover.weekday); return }
      sel.cancelPlacement() // click off a cell cancels
      return
    }
    if (down) {
      const moved = Math.abs(event.clientX - down.x) > 4 || Math.abs(event.clientY - down.y) > 4
      if (moved) return // this click ends a real marquee drag — keep the selection
    }
    if (event.target.closest('.pb-month-chip-wrap, .pb-month-week-label, .pb-month-add')) return
    if (selectionCount > 0) sel.clearSelection()
    setOutlineSuppressed(true)
  }

  // Opening a week from its label re-asserts the active-week outline.
  function handleJumpToWeek(week, year) {
    setOutlineSuppressed(false)
    onJumpToWeek(week, year)
  }

  // While sessions are "in hand" (armed Copy/Cut placement), a right-click
  // anywhere discards them instead of showing a menu.
  function onPanelContextMenu(event) {
    if (!sel.isPlacementArmed()) return
    event.preventDefault()
    sel.cancelPlacement()
  }

  return (
    <main className="pb-panel pb-panel--calendar" onClick={onPanelClick} onContextMenu={onPanelContextMenu}>
      <BuilderPanelHeader
        
        copy={hasClipboard
          ? `${selectionCount > 0 ? `${selectionCount} session${selectionCount > 1 ? 's' : ''} selected · ` : ''}Hover a day and press ⌘/Ctrl+V to paste.`
          : ''}
        panelId="calendar"
        visiblePanelIds={visiblePanelIds}
      />

      <div className="pb-month-toolbar">
        <button
          type="button"
          className={`pb-month-toggle${showSignals ? ' is-on' : ''}`}
          onClick={() => setShowSignals(v => !v)}
          aria-pressed={showSignals}
          title="Show weekly load signals (load, ramp, readiness)"
        >
          {showSignals ? 'Hide load signals' : 'Show load signals'}
        </button>
        <button
          type="button"
          className={`pb-month-toggle${showTrends ? ' is-on' : ''}`}
          onClick={() => setShowTrends(v => !v)}
          aria-pressed={showTrends}
          title="Show training trends (distance, duration, load over time)"
        >
          {showTrends ? 'Hide trends' : 'Show trends'}
        </button>
      </div>

      {showTrends && <MonthTrendPanel series={weekSeries} />}

      {loadingOverview ? (
        <div className="pb-empty-state">Loading month…</div>
      ) : (
        <div
          ref={gridRef}
          className={`pb-month-grid${dragState ? ' is-dragging' : ''}${sel.placement ? ' is-placing' : ''}`}
          role="grid"
          onPointerDown={onGridPointerDown}
          onDragOver={event => {
            // Between-slot tracking: when a selection drag is over the grid but
            // NOT over a day cell, clear the hovered destination (so destination
            // ghosts hide) and show the cursor follower at the pointer.
            if (!sel.isDraggingSelection()) return
            if (event.target.closest('.pb-month-cell')) return
            event.preventDefault()
            sel.setHoverCell(null)
            sel.updateDragCursor(event.clientX, event.clientY, false)
          }}
        >
          <div className="pb-month-head" role="row">
            <span className="pb-month-corner" aria-hidden="true" />
            {WEEKDAY_OPTIONS.map(day => (
              <span key={day.value} className="pb-month-head-day" role="columnheader">{day.shortLabel}</span>
            ))}
          </div>

          {overviewWeeks.map(weekEntry => {
            const weekKey = weekEntry.key
            const dayBuckets = groupWorkoutsByWeekday(overviewWorkoutsByWeekKey[weekKey] || [])
            const isSelected = weekKey === selectedWeekKey && !outlineSuppressed
            return (
              <div
                key={weekKey}
                className={`pb-month-row${isSelected ? ' is-selected' : ''}`}
                role="row"
              >
                <div className="pb-month-week-col">
                  <button
                    type="button"
                    className="pb-month-week-label"
                    onClick={() => handleJumpToWeek(weekEntry.week, weekEntry.year)}
                    title={`Open week ${weekEntry.week} in the week view`}
                    aria-label={`Open week ${weekEntry.week} in the week view`}
                  >
                    <span className="pb-month-week-num">W{weekEntry.week}</span>
                    <span className="pb-month-week-range">{formatRange(weekEntry.monday, weekEntry.sunday)}</span>
                  </button>
                  <MonthWeekSummary workouts={overviewWorkoutsByWeekKey[weekKey] || []} />
                </div>

                {dayBuckets.map(day => {
                  const key = cellKey(weekEntry.week, weekEntry.year, day.value)
                  const baseDropProps = makeDropZoneProps({
                    dragState, handleDropTargetChange,
                    handleDrop: () => handleCellDrop(weekEntry.week, weekEntry.year, day.value, null),
                    weekday: day.value, week: weekEntry.week, year: weekEntry.year,
                  })
                  // During a selection drag, dragState is null (it's not a
                  // useDragHandlers drag), so allow the drop explicitly here.
                  const dayDropProps = {
                    ...baseDropProps,
                    onDragOver: event => {
                      if (sel.isDraggingSelection()) {
                        event.preventDefault()
                        // Pointer events don't fire mid-drag, so set the hovered
                        // destination here to drive the ghost preview.
                        sel.setHoverCell({ week: weekEntry.week, year: weekEntry.year, weekday: day.value })
                        sel.updateDragCursor(event.clientX, event.clientY, true)
                        return
                      }
                      baseDropProps.onDragOver(event)
                    },
                    onDrop: event => {
                      if (sel.isDraggingSelection()) {
                        event.preventDefault()
                        handleCellDrop(weekEntry.week, weekEntry.year, day.value, null)
                        return
                      }
                      baseDropProps.onDrop(event)
                    },
                  }
                  // Dragging a selected chip moves the whole selection. The
                  // native drag image is suppressed in beginSelectionDrag; a
                  // custom cursor-follower + destination ghosts (rendered below)
                  // show where the sessions will land. An unselected chip drags
                  // on its own via the normal single-session handlers.
                  const selectionChipDrag = {
                    onDragStart: (workout, event) => { sel.beginSelectionDrag(event) },
                    onDragEnd: () => { sel.endSelectionDrag(); handleDragEnd() },
                  }
                  const isDayTarget = Boolean(dragState)
                    && dropTarget?.weekday === day.value
                    && Number(dropTarget?.week) === weekEntry.week
                    && Number(dropTarget?.year) === weekEntry.year
                    && !dropTarget?.beforeWorkoutId
                  const dayMinutes = Math.round(
                    day.workouts.reduce((sum, w) => sum + sessionDuration(w), 0)
                  )
                  const dayKm = day.workouts.reduce((sum, w) => sum + sessionDistance(w), 0)
                  const isEmptyDay = day.workouts.length === 0
                  // This cell's calendar date = Monday + (weekday - 1) days.
                  const cellDate = weekEntry.monday
                    ? new Date(weekEntry.monday.getFullYear(), weekEntry.monday.getMonth(),
                        weekEntry.monday.getDate() + (day.value - 1))
                    : null
                  const isToday = cellDate
                    && (cellDate.getFullYear() * 10000 + cellDate.getMonth() * 100 + cellDate.getDate()) === todayStamp
                  return (
                    <div
                      key={day.value}
                      className={`pb-month-cell${isEmptyDay ? ' is-empty' : ''}${isToday ? ' is-today' : ''}${isDayTarget ? ' is-target' : ''}`}
                      role="gridcell"
                      onPointerEnter={() => sel.setHoverCell({ week: weekEntry.week, year: weekEntry.year, weekday: day.value })}
                      {...dayDropProps}
                    >
                      {day.workouts.map(w => {
                        const chipSelected = sel.isSessionSelected(w.id)
                        return (
                        <MonthChip
                          key={w.id}
                          workout={w}
                          onSelect={workout => {
                            // While a Copy/Cut placement is armed, a click on a
                            // chip places at the hovered day instead of opening
                            // the editor (handled by onPanelClick); swallow it.
                            if (sel.isPlacementArmed()) return
                            onSelectWorkout(workout)
                          }}
                          onToggleSelect={() => sel.toggleSession(w.id)}
                          onContextMenu={event => handleChipContextMenu(w.id, event)}
                          onRemove={onDeleteWorkout}
                          isSelected={chipSelected}
                          drag={chipSelected ? selectionChipDrag : cellDrag}
                          dropProps={makeDropZoneProps({
                            dragState, handleDropTargetChange,
                            handleDrop: () => handleCellDrop(weekEntry.week, weekEntry.year, day.value, w.id),
                            weekday: day.value, beforeWorkoutId: w.id,
                            week: weekEntry.week, year: weekEntry.year, stopPropagation: true,
                          })}
                          isDragging={dragState?.kind === 'workout' && dragState.workoutId === w.id}
                          isGhosting={sel.isGhostingSession(w.id)}
                          isDropTarget={dropTarget?.beforeWorkoutId === w.id
                            && Number(dropTarget?.week) === weekEntry.week
                            && Number(dropTarget?.year) === weekEntry.year}
                        />
                        )
                      })}
                      {(sel.selectionPreview[key] || []).map((ghost, i) => (
                        <MonthGhostChip key={`ghost-${ghost.id || i}`} workout={ghost} />
                      ))}
                      <button
                        type="button"
                        className="pb-month-add"
                        onClick={() => {
                          // While sessions are in hand, the "+" must not open the
                          // add form — the click places the held sessions on this
                          // day instead (handled by onPanelClick).
                          if (sel.isPlacementArmed()) return
                          onAddSessionToDay(weekEntry.week, weekEntry.year, day.value)
                        }}
                        aria-label={`Add a session on ${day.label}, week ${weekEntry.week}`}
                        title={`Add a session on ${day.shortLabel}, week ${weekEntry.week}`}
                      >
                        <Plus aria-hidden="true" strokeWidth={2} />
                      </button>
                      {(dayMinutes > 0 || dayKm > 0) && (
                        <div className="pb-month-cell-foot">
                          {dayMinutes > 0 && <span>{formatDurationLabel(dayMinutes)}</span>}
                          {dayKm > 0 && <span>{formatKmValue(dayKm)}</span>}
                        </div>
                      )}
                    </div>
                  )
                })}
                {showSignals && (
                  <MonthWeekSignals signal={signalMap[weekKey]} />
                )}
              </div>
            )
          })}
        </div>
      )}

      <MarqueeBox marquee={sel.marquee} />

      <SelectionContextMenu
        menu={contextMenu}
        count={selectionCount}
        onCopy={() => { sel.armPlacement('copy'); setContextMenu(null) }}
        onCut={() => { sel.armPlacement('cut'); setContextMenu(null) }}
      />

      {sel.dragCursor && (
        <div
          className="pb-month-follower"
          style={{ left: sel.dragCursor.x + 12, top: sel.dragCursor.y + 12 }}
          aria-hidden="true"
        >
          {sel.selectedSessions().map((s, i) => (
            <MonthGhostChip key={`follow-${s.id || i}`} workout={s} />
          ))}
        </div>
      )}
    </main>
  )
}
