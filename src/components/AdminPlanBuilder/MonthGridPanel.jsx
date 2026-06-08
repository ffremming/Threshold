import { useMemo, useRef, useState } from 'react'
import { Plus, X } from 'lucide-react'
import {
  ACTIVITY_TAG_MAP, WEEKDAY_OPTIONS, groupWorkoutsByWeekday,
  normalizeIntensityZones, getZoneBarBackground, workoutHasZones,
  formatDurationLabel, formatKmValue, ZONE_COLORS,
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

function MonthChip({ workout, onSelect, onRemove, drag, dropProps, isDragging, isDropTarget, isGhosting }) {
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
  ].filter(Boolean).join(' ')
  return (
    <div className="pb-month-chip-wrap" {...(dropProps || {})}>
      <button
        type="button"
        className={className}
        style={{ '--pb-zone-bar': zoneBar, '--pb-zone-fill': zoneFill }}
        onClick={() => onSelect?.(workout)}
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
    modalOpen,
  })

  const { showSignals, setShowSignals } = useMonthSignalsToggle()
  const signalMap = useMemo(
    () => computeWeekSignals(overviewWeeks, overviewWorkoutsByWeekKey, currentWeek, currentYear),
    [overviewWeeks, overviewWorkoutsByWeekKey, currentWeek, currentYear]
  )

  const { showTrends, setShowTrends } = useMonthTrendsToggle()
  const weekSeries = useMemo(
    () => computeWeekSeries(overviewWeeks, overviewWorkoutsByWeekKey, currentWeek, currentYear),
    [overviewWeeks, overviewWorkoutsByWeekKey, currentWeek, currentYear]
  )

  const cellDrag = { onDragStart: handleWorkoutDragStart, onDragEnd: handleDragEnd }
  const hasClipboard = Boolean(sel.clipboard)
  const selectionCount = sel.selectedCells.size

  // Today's calendar date (local midnight), for highlighting the current day cell.
  const today = new Date()
  const todayStamp = today.getFullYear() * 10000 + today.getMonth() * 100 + today.getDate()

  // Drop on a day cell. A selection drag (dragging a selected cell) moves the
  // whole selection anchored to this cell. A single-session drag whose source
  // cell is selected does the same. Otherwise: normal single-session / template
  // drop.
  function handleCellDrop(week, year, weekday, beforeWorkoutId) {
    if (sel.isDraggingSelection() && selectionCount > 0) {
      sel.endSelectionDrag()
      return sel.moveSelection(week, year, weekday)
    }
    const drag = dragState
    if (drag?.kind === 'workout' && selectionCount > 0) {
      // The dragged workout might be in any week; find its cell across the window.
      const all = Object.values(overviewWorkoutsByWeekKey).flat()
      const dragged = all.find(x => x.id === drag.workoutId)
      if (dragged && sel.isSelectedWorkout(dragged.week, dragged.year, dragged.weekday)) {
        handleDragEnd()
        return sel.moveSelection(week, year, weekday)
      }
    }
    return handleDrop(weekday, beforeWorkoutId, week, year)
  }

  // Start a marquee from empty grid background. Skip chips/buttons, and skip an
  // already-selected cell — pressing inside the current selection should drag the
  // whole selection (the cell's native draggable handles that), not start a new
  // marquee that would clear the selection.
  function onGridPointerDown(event) {
    if (event.target.closest('.pb-month-chip-wrap, .pb-month-week-label, .pb-month-add')) return
    if (event.target.closest('.pb-month-cell.is-selected-cell')) return
    // Remember where a potential marquee started so the trailing click can tell a
    // real drag-select apart from a plain click on dead space.
    marqueeDownRef.current = { x: event.clientX, y: event.clientY }
    sel.beginMarquee(event)
  }

  // Clicking any non-interactive "dead" spot (panel padding, the weekday header
  // row, the week summary, a non-selected empty cell) clears the cell selection
  // and hides the active-week row outline. A click that is the tail end of a
  // marquee drag-select must NOT clear what it just selected.
  function onPanelClick(event) {
    const down = marqueeDownRef.current
    marqueeDownRef.current = null
    if (down) {
      const moved = Math.abs(event.clientX - down.x) > 4 || Math.abs(event.clientY - down.y) > 4
      if (moved) return // this click ends a real marquee drag — keep the selection
    }
    if (event.target.closest('.pb-month-chip-wrap, .pb-month-week-label, .pb-month-add')) return
    if (event.target.closest('.pb-month-cell.is-selected-cell')) return
    if (selectionCount > 0) sel.clearSelection()
    setOutlineSuppressed(true)
  }

  // Opening a week from its label re-asserts the active-week outline.
  function handleJumpToWeek(week, year) {
    setOutlineSuppressed(false)
    onJumpToWeek(week, year)
  }

  return (
    <main className="pb-panel pb-panel--calendar" onClick={onPanelClick}>
      <BuilderPanelHeader
        
        copy={hasClipboard
          ? `${selectionCount > 0 ? `${selectionCount} cell${selectionCount > 1 ? 's' : ''} selected · ` : ''}Hover a day and press ⌘/Ctrl+V to paste.`
          : ''}
        panelId="calendar"
        visiblePanelIds={visiblePanelIds}
      />

      <div className="pb-month-toolbar">
        <button
          type="button"
          className={`pb-month-signals-toggle${showSignals ? ' is-on' : ''}`}
          onClick={() => setShowSignals(v => !v)}
          aria-pressed={showSignals}
          title="Show weekly load signals (load, ramp, readiness)"
        >
          {showSignals ? 'Hide load signals' : 'Show load signals'}
        </button>
        <button
          type="button"
          className={`pb-month-signals-toggle${showTrends ? ' is-on' : ''}`}
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
          className={`pb-month-grid${dragState ? ' is-dragging' : ''}`}
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
                  const cellSelected = sel.isCellSelected(key)
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
                  // A selected cell is the handle for dragging the whole selection.
                  const cellDragProps = cellSelected
                    ? {
                        draggable: true,
                        onDragStart: event => sel.beginSelectionDrag(event),
                        onDragEnd: () => sel.endSelectionDrag(),
                      }
                    : undefined
                  // Dragging a chip whose cell is selected moves the whole
                  // selection. The native drag image is suppressed in
                  // beginSelectionDrag; a custom cursor-follower + destination
                  // ghosts (rendered below) show where the sessions will land.
                  const chipDrag = cellSelected
                    ? {
                        onDragStart: (workout, event) => {
                          sel.beginSelectionDrag(event)
                        },
                        onDragEnd: () => { sel.endSelectionDrag(); handleDragEnd() },
                      }
                    : cellDrag
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
                      data-cell-key={key}
                      className={`pb-month-cell${isEmptyDay ? ' is-empty' : ''}${isToday ? ' is-today' : ''}${isDayTarget ? ' is-target' : ''}${cellSelected ? ' is-selected-cell' : ''}`}
                      role="gridcell"
                      onPointerEnter={() => sel.setHoverCell({ week: weekEntry.week, year: weekEntry.year, weekday: day.value })}
                      {...cellDragProps}
                      {...dayDropProps}
                    >
                      {day.workouts.map(w => (
                        <MonthChip
                          key={w.id}
                          workout={w}
                          onSelect={onSelectWorkout}
                          onRemove={onDeleteWorkout}
                          drag={chipDrag}
                          dropProps={makeDropZoneProps({
                            dragState, handleDropTargetChange,
                            handleDrop: () => handleCellDrop(weekEntry.week, weekEntry.year, day.value, w.id),
                            weekday: day.value, beforeWorkoutId: w.id,
                            week: weekEntry.week, year: weekEntry.year, stopPropagation: true,
                          })}
                          isDragging={dragState?.kind === 'workout' && dragState.workoutId === w.id}
                          isGhosting={sel.isGhostingSession(weekEntry.week, weekEntry.year, day.value)}
                          isDropTarget={dropTarget?.beforeWorkoutId === w.id
                            && Number(dropTarget?.week) === weekEntry.week
                            && Number(dropTarget?.year) === weekEntry.year}
                        />
                      ))}
                      {(sel.selectionPreview[key] || []).map((ghost, i) => (
                        <MonthGhostChip key={`ghost-${ghost.id || i}`} workout={ghost} />
                      ))}
                      <button
                        type="button"
                        className="pb-month-add"
                        onClick={() => onAddSessionToDay(weekEntry.week, weekEntry.year, day.value)}
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
