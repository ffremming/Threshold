import { Doughnut } from 'react-chartjs-2'
import { Plus, X } from 'lucide-react'
import ActivityIcon from '../ActivityIcon'
import { EmptyState } from '../ui'
import { ChartCard, Stat } from '../AnalysisDashboard/sections/primitives'
import { doughnutOptions } from '../AnalysisDashboard/charts/options'
import { buildZoneDoughnutData } from '../AnalysisDashboard/charts/data'
import { computeWeekSummary, sessionDuration, sessionDistance } from '../../utils/weekSummary'
import {
  ACTIVITY_TAG_MAP, formatDurationLabel, formatKmValue,
  groupWorkoutsByWeekday, getIntensityZoneLabel,
  normalizeIntensityZones, getZoneBarBackground, workoutHasZones,
  scoreWeek,
} from '../../utils'
import QualityWidget from '../dimensions/QualityWidget'
import MuscleHeatmap from '../dimensions/MuscleHeatmap'
import { makeMuscleResolver } from '../dimensions/useMuscleResolver'
import './WeekOverview.css'

// Stable across renders — the resolver only reads the static exercise library.
const resolveMuscles = makeMuscleResolver()

// Draws each slice's value at the segment centroid. Scoped to this file's
// charts via the `plugins` prop so the analysis-dashboard doughnuts are untouched.
// Reads a per-chart formatter from options.plugins.sliceValue.format(rawValue).
const sliceValuePlugin = {
  id: 'sliceValue',
  afterDatasetsDraw(chart, _args, opts) {
    const format = opts?.format || (v => `${v}`)
    const { ctx } = chart
    const meta = chart.getDatasetMeta(0)
    if (!meta?.data) return
    ctx.save()
    ctx.font = '700 11px system-ui, sans-serif'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    meta.data.forEach((arc, i) => {
      const value = chart.data.datasets[0].data[i]
      if (!value) return
      const { x, y } = arc.tooltipPosition()
      const text = format(value)
      ctx.lineWidth = 3
      ctx.strokeStyle = 'rgba(255,255,255,0.9)'
      ctx.strokeText(text, x, y)
      ctx.fillStyle = '#1e293b'
      ctx.fillText(text, x, y)
    })
    ctx.restore()
  },
}

// Per-chart options that enable the slice-value labels with a formatter.
function valueOptions(format) {
  return {
    ...doughnutOptions,
    plugins: { ...doughnutOptions.plugins, sliceValue: { format } },
  }
}

// Hours-by-activity doughnut (duration, not load).
function buildHoursByActivityData(activityDuration) {
  const entries = Object.entries(activityDuration)
    .filter(([, mins]) => mins > 0)
    .sort((a, b) => b[1] - a[1])
  return {
    labels: entries.map(([tag]) => ACTIVITY_TAG_MAP[tag]?.label || tag),
    datasets: [{
      data: entries.map(([, mins]) => Math.round(mins)),
      backgroundColor: entries.map(([tag]) => ACTIVITY_TAG_MAP[tag]?.color || '#94a3b8'),
      borderWidth: 0,
      hoverOffset: 10,
    }],
  }
}

function SessionCell({ workout, onSelect, drag, dropProps, isDragging, isDropTarget, onRemove }) {
  const tag = ACTIVITY_TAG_MAP[workout.activityTag]
  const mins = Math.round(sessionDuration(workout))
  const km = sessionDistance(workout)
  const zoneLabel = getIntensityZoneLabel(workout)
  // Strength sessions have no intensity zone — no label and no accent bar.
  const zoneBar = workoutHasZones(workout.activityTag)
    ? getZoneBarBackground(normalizeIntensityZones(workout.type, workout.intensityZone))
    : 'none'
  const draggable = Boolean(drag)
  const className = [
    'wo-cell',
    draggable ? 'wo-cell--draggable' : '',
    onRemove ? 'wo-cell--removable' : '',
    isDragging ? 'is-drag' : '',
    isDropTarget ? 'is-target' : '',
  ].filter(Boolean).join(' ')
  return (
    <div className="wo-cell-wrap" {...(dropProps || {})}>
      <button
        type="button"
        className={className}
        style={{ '--wo-zone-bar': zoneBar }}
        onClick={() => onSelect?.(workout)}
        disabled={!onSelect}
        draggable={draggable}
        onDragStart={draggable ? event => drag.onDragStart(workout, event) : undefined}
        onDragEnd={draggable ? drag.onDragEnd : undefined}
      >
        <span className="wo-cell-title-row">
          {tag?.icon && <ActivityIcon name={tag.icon} className="wo-cell-icon" title={tag.label} />}
          <span className="wo-cell-title">{workout.title || tag?.label || 'Session'}</span>
        </span>
        {tag?.label && <span className="wo-cell-tag">{tag.label}</span>}
        <span className="wo-cell-data">
          {mins > 0 && <span>{formatDurationLabel(mins)}</span>}
          {km > 0 && <span>{formatKmValue(km)}</span>}
          {zoneLabel && <span>{zoneLabel}</span>}
        </span>
      </button>
      {onRemove && (
        <button
          type="button"
          className="wo-cell-remove"
          onClick={event => { event.stopPropagation(); onRemove(workout) }}
          draggable={false}
          title={`Remove ${workout.title || 'session'}`}
          aria-label={`Remove ${workout.title || 'session'}`}
        >
          <X aria-hidden="true" strokeWidth={2.4} />
        </button>
      )}
    </div>
  )
}

// `dnd` is optional. When omitted the timetable renders exactly as a
// view-only week plan (used by PlanTab). When provided, day columns become
// drop zones and session cells become draggable (used by AdminPlanBuilder).
//   dnd: {
//     onWorkoutDragStart(workout, event), onWorkoutDragEnd(event),
//     getDayDropZoneProps(weekdayValue),
//     getCellDropZoneProps(workout, weekdayValue),
//     isWorkoutDragging(workout), isCellDropTarget(workout, weekdayValue),
//     isDayDropTarget(weekdayValue),
//     onRemoveWorkout(workout),        // optional — shows an X on each session
//     onAddSessionToDay(weekdayValue), // optional — shows a + under each day
//   }
export default function WeekOverview({ workouts, onSelectWorkout, dnd }) {
  const summary = computeWeekSummary(workouts)
  const days = groupWorkoutsByWeekday(workouts || [])
  const weekQuality = scoreWeek(workouts || [], { resolveMuscles })

  if (summary.count === 0) {
    return (
      <EmptyState
        title="No sessions planned this week"
        description="Plan sessions from the session bank to see the week summary here."
      />
    )
  }

  const hoursData = buildHoursByActivityData(summary.activityDuration)
  const zoneData = buildZoneDoughnutData(summary.zones)
  const hasZones = Object.values(summary.zones).some(v => v > 0)

  const distanceList = Object.entries(summary.activityDistance)
    .sort((a, b) => b[1] - a[1])

  return (
    <div className="week-overview">
      <div className="wo-summary">
        <Stat label="Total time" value={formatDurationLabel(Math.round(summary.totalDuration))} />
        <Stat label="Total distance" value={formatKmValue(summary.totalDistance)} />
        <Stat label="Sessions" value={summary.count} />
        <Stat label="Total load" value={Math.round(summary.totalLoad)} />
      </div>

      <div className={`wo-timetable${dnd ? ' wo-timetable--dnd' : ''}`}>
        {days.map(day => {
          const dayMinutes = Math.round(
            day.workouts.reduce((sum, w) => sum + sessionDuration(w), 0)
          )
          const dayDropProps = dnd?.getDayDropZoneProps?.(day.value)
          const cellDrag = dnd
            ? { onDragStart: dnd.onWorkoutDragStart, onDragEnd: dnd.onWorkoutDragEnd }
            : undefined
          const dayDraggable = Boolean(dnd?.onDayDragStart) && day.workouts.length > 0
          const dayDragProps = dayDraggable
            ? {
                draggable: true,
                onDragStart: event => dnd.onDayDragStart(day.value, event),
                onDragEnd: dnd.onWorkoutDragEnd,
              }
            : undefined
          return (
          <div
            key={day.value}
            className={`wo-col${dnd?.isDayDropTarget?.(day.value) ? ' is-target' : ''}`}
            {...(dayDropProps || {})}
          >
            <div
              className={`wo-col-head${dayDraggable ? ' wo-col-head--draggable' : ''}`}
              title={dayDraggable ? 'Drag to move the whole day' : undefined}
              {...(dayDragProps || {})}
            >{day.shortLabel}</div>
            <div className="wo-col-body" {...(dayDragProps || {})}>
              {day.workouts.length === 0 && !dnd?.onAddSessionToDay
                ? <span className="wo-rest">–</span>
                : day.workouts.map(w => (
                    <SessionCell
                      key={w.id}
                      workout={w}
                      onSelect={onSelectWorkout}
                      drag={cellDrag}
                      dropProps={dnd?.getCellDropZoneProps?.(w, day.value)}
                      isDragging={dnd?.isWorkoutDragging?.(w)}
                      isDropTarget={dnd?.isCellDropTarget?.(w, day.value)}
                      onRemove={dnd?.onRemoveWorkout}
                    />
                  ))}
              {dnd?.onAddSessionToDay && (
                <button
                  type="button"
                  className="wo-col-add"
                  onClick={() => dnd.onAddSessionToDay(day.value)}
                  title={`Add a session on ${day.label || day.shortLabel}`}
                  aria-label={`Add a session on ${day.label || day.shortLabel}`}
                >
                  <Plus aria-hidden="true" strokeWidth={2} />
                </button>
              )}
            </div>
            <div className="wo-col-foot">{dayMinutes > 0 ? formatDurationLabel(dayMinutes) : '–'}</div>
          </div>
          )
        })}
      </div>

      <div className="wo-grid">
        <ChartCard title="Hours by activity">
          <Doughnut
            data={hoursData}
            options={valueOptions(v => formatDurationLabel(v))}
            plugins={[sliceValuePlugin]}
          />
        </ChartCard>

        <ChartCard title="Intensity zones" caption="Minutes in each zone">
          {hasZones
            ? <Doughnut
                data={zoneData}
                options={valueOptions(v => formatDurationLabel(v))}
                plugins={[sliceValuePlugin]}
              />
            : <p className="wo-empty-note">No zone data for this week.</p>}
        </ChartCard>

        <ChartCard title="Distance by activity">
          {distanceList.length === 0 ? (
            <p className="wo-empty-note">No distance recorded this week.</p>
          ) : (
            <ul className="wo-km-list">
              {distanceList.map(([tag, km]) => (
                <li key={tag}>
                  <span className="wo-km-dot" style={{ background: ACTIVITY_TAG_MAP[tag]?.color || '#94a3b8' }} />
                  <span className="wo-km-label">{ACTIVITY_TAG_MAP[tag]?.label || tag}</span>
                  <span className="wo-km-value">{formatKmValue(km)}</span>
                </li>
              ))}
            </ul>
          )}
        </ChartCard>
      </div>

      <div className="wo-quality">
        <QualityWidget dims={weekQuality.dims} title="Training quality this week" />
        <MuscleHeatmap musclesWorked={weekQuality.musclesWorked} title="Muscles worked this week" />
      </div>
    </div>
  )
}
