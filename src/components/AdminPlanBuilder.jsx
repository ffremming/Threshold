import { useEffect, useMemo, useState } from 'react'
import './AdminPlanBuilder.css'
import {
  ArcElement,
  BarElement,
  CategoryScale,
  Chart as ChartJS,
  Filler,
  Legend,
  LineElement,
  LinearScale,
  PointElement,
  Title,
  Tooltip,
} from 'chart.js'
import { Bar, Doughnut, Line } from 'react-chartjs-2'
import {
  ACTIVITY_TAGS,
  ACTIVITY_TAG_MAP,
  TYPE_ICONS,
  compareWorkoutsBySchedule,
  estimateMechanicalLoad,
  estimateWorkoutDuration,
  estimateWorkoutLoad,
  formatIntensityZoneLabel,
  formatDurationLabel,
  formatKmValue,
  formatWorkoutSchedule,
  formatWorkoutTime,
  getAdjacentWeek,
  getWorkoutDistance,
  getWeekKey,
  getWeekNumber,
  isHardWorkout,
  groupWorkoutsByWeekday,
  normalizeIntensityZones,
} from '../utils'
import ActivityIcon from './ActivityIcon'
import BirdsEyeOverview from './BirdsEyeOverview'
import SystemIcon from './SystemIcon'
import { IconButton, WeekNav } from './ui'

const BUILDER_LAYOUT_STORAGE_KEY = 'training-planner:builder-layout:v1'
const DEFAULT_PANEL_ORDER = ['bank', 'extra', 'calendar', 'insights']
const DEFAULT_PANEL_SIZES = {
  bank: 360,
  extra: 360,
  calendar: 980,
  insights: 420,
}

const VISIBLE_ACTIVITIES_STORAGE_KEY = 'training-planner:builder-visible-activities:v1'
const PINNED_ACTIVITY_TAGS = ['run', 'walking', 'strength']
const DEFAULT_VISIBLE_ACTIVITIES = [...PINNED_ACTIVITY_TAGS]

function readVisibleActivities() {
  if (typeof window === 'undefined') return DEFAULT_VISIBLE_ACTIVITIES
  try {
    const saved = JSON.parse(window.localStorage.getItem(VISIBLE_ACTIVITIES_STORAGE_KEY) || 'null')
    if (!Array.isArray(saved)) return DEFAULT_VISIBLE_ACTIVITIES
    const valid = saved.filter(value => ACTIVITY_TAG_MAP[value])
    const withPinned = Array.from(new Set([...PINNED_ACTIVITY_TAGS, ...valid]))
    return withPinned
  } catch {
    return DEFAULT_VISIBLE_ACTIVITIES
  }
}

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
)

const builderChartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      position: 'bottom',
      labels: {
        usePointStyle: true,
        pointStyle: 'circle',
        padding: 14,
        boxWidth: 10,
        font: { size: 11, weight: '600' },
      },
    },
  },
  scales: {
    x: {
      grid: { display: false },
      ticks: { font: { size: 11, weight: '600' } },
    },
    y: {
      beginAtZero: true,
      grid: { color: 'rgba(148, 163, 184, 0.18)' },
      ticks: { font: { size: 11 } },
    },
  },
}

const doughnutOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      position: 'bottom',
      labels: {
        usePointStyle: true,
        pointStyle: 'circle',
        padding: 12,
        boxWidth: 10,
        font: { size: 11, weight: '600' },
      },
    },
  },
}

const trendChartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  interaction: {
    mode: 'index',
    intersect: false,
  },
  plugins: {
    legend: {
      position: 'bottom',
      labels: {
        usePointStyle: true,
        pointStyle: 'circle',
        padding: 12,
        boxWidth: 10,
        font: { size: 11, weight: '600' },
      },
    },
  },
  scales: {
    x: {
      grid: { display: false },
      ticks: { font: { size: 11, weight: '600' } },
    },
    y: {
      beginAtZero: true,
      grid: { color: 'rgba(148, 163, 184, 0.18)' },
      ticks: { font: { size: 11 } },
    },
    y1: {
      beginAtZero: true,
      position: 'right',
      grid: { drawOnChartArea: false },
      ticks: { font: { size: 11 } },
    },
  },
}

function average(values) {
  if (!values.length) return 0
  return values.reduce((sum, value) => sum + value, 0) / values.length
}

function averageLastValues(values, count, endIndexInclusive) {
  const start = Math.max(0, endIndexInclusive - count + 1)
  const slice = values.slice(start, endIndexInclusive + 1)
  return average(slice)
}

function safeDivide(a, b) {
  if (!Number.isFinite(a) || !Number.isFinite(b) || b === 0) return 0
  return a / b
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max)
}

export default function AdminPlanBuilder({
  currentWeek,
  currentYear,
  monday,
  sunday,
  isThisWeek,
  workoutLayout = 'calendar',
  selectedAthleteName,
  workouts,
  loadingWorkouts,
  templates,
  loadingTemplates,
  overviewWeeks,
  overviewWorkoutsByWeekKey,
  loadingOverview,
  analysisWeeks,
  analysisWorkoutsByWeekKey,
  loadingAnalysis,
  onWeekChange,
  onSelectWorkout,
  onDeleteWorkout,
  onToggleComplete,
  onMoveWorkout,
  onMoveWorkoutByDrag,
  onAddTemplateToDay,
  onEditTemplate,
  onCreateTemplate,
  onDeleteTemplate,
}) {
  const [dragState, setDragState] = useState(null)
  const [dropTarget, setDropTarget] = useState(null)
  const [showOverview, setShowOverview] = useState(false)
  const [bankWindows, setBankWindows] = useState([])
  const [viewportWidth, setViewportWidth] = useState(() => (
    typeof window !== 'undefined' ? window.innerWidth : 1440
  ))
  const [panelOrder, setPanelOrder] = useState(() => {
    if (typeof window === 'undefined') return DEFAULT_PANEL_ORDER
    try {
      const saved = JSON.parse(window.localStorage.getItem(BUILDER_LAYOUT_STORAGE_KEY) || '{}')
      return Array.isArray(saved.panelOrder) ? saved.panelOrder : DEFAULT_PANEL_ORDER
    } catch {
      return DEFAULT_PANEL_ORDER
    }
  })
  const [panelSizes, setPanelSizes] = useState(() => {
    if (typeof window === 'undefined') return DEFAULT_PANEL_SIZES
    try {
      const saved = JSON.parse(window.localStorage.getItem(BUILDER_LAYOUT_STORAGE_KEY) || '{}')
      return {
        ...DEFAULT_PANEL_SIZES,
        ...(saved.panelSizes || {}),
      }
    } catch {
      return DEFAULT_PANEL_SIZES
    }
  })
  const [activeResizer, setActiveResizer] = useState(null)
  const [visibleActivities, setVisibleActivities] = useState(readVisibleActivities)

  useEffect(() => {
    if (typeof window === 'undefined') return
    window.localStorage.setItem(VISIBLE_ACTIVITIES_STORAGE_KEY, JSON.stringify(visibleActivities))
  }, [visibleActivities])

  function addVisibleActivity(value) {
    setVisibleActivities(prev => (prev.includes(value) ? prev : [...prev, value]))
  }

  function removeVisibleActivity(value) {
    if (PINNED_ACTIVITY_TAGS.includes(value)) return
    setVisibleActivities(prev => prev.filter(item => item !== value))
  }

  const isDesktopBuilder = viewportWidth >= 1280

  const visiblePanelIds = useMemo(() => {
    const base = ['bank', 'calendar', 'insights']
    if (bankWindows.length > 0) {
      base.splice(1, 0, 'extra')
    }
    return panelOrder.filter(panelId => base.includes(panelId))
  }, [bankWindows.length, panelOrder])

  const calendarPanelWidth = panelSizes.calendar || DEFAULT_PANEL_SIZES.calendar
  const builderLayoutStyle = {
    '--builder-side-font': calendarPanelWidth < 900 ? '0.68rem' : calendarPanelWidth < 1120 ? '0.72rem' : '0.74rem',
    '--builder-side-title-font': calendarPanelWidth < 900 ? '0.78rem' : calendarPanelWidth < 1120 ? '0.82rem' : '0.84rem',
    '--builder-calendar-day-font': calendarPanelWidth < 900 ? '0.68rem' : calendarPanelWidth < 1120 ? '0.72rem' : '0.78rem',
    '--builder-calendar-meta-font': calendarPanelWidth < 900 ? '0.58rem' : calendarPanelWidth < 1120 ? '0.6rem' : '0.62rem',
    '--builder-calendar-card-title-font': calendarPanelWidth < 900 ? '0.66rem' : calendarPanelWidth < 1120 ? '0.7rem' : '0.72rem',
    '--builder-calendar-support-font': calendarPanelWidth < 900 ? '0.56rem' : calendarPanelWidth < 1120 ? '0.58rem' : '0.6rem',
  }

  useEffect(() => {
    function handleResize() {
      setViewportWidth(window.innerWidth)
    }

    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  useEffect(() => {
    if (!dragState) return

    const EDGE = 90
    const MAX_SPEED = 22
    let pointerY = null
    let frame = null

    function step() {
      if (pointerY == null) {
        frame = null
        return
      }
      const viewportH = window.innerHeight
      let delta = 0
      if (pointerY < EDGE) {
        delta = -MAX_SPEED * (1 - pointerY / EDGE)
      } else if (pointerY > viewportH - EDGE) {
        delta = MAX_SPEED * (1 - (viewportH - pointerY) / EDGE)
      }
      if (delta !== 0) {
        window.scrollBy(0, delta)
      }
      frame = window.requestAnimationFrame(step)
    }

    function handleDragOver(event) {
      pointerY = event.clientY
      if (frame == null) frame = window.requestAnimationFrame(step)
    }

    window.addEventListener('dragover', handleDragOver)

    return () => {
      window.removeEventListener('dragover', handleDragOver)
      if (frame != null) window.cancelAnimationFrame(frame)
    }
  }, [dragState])

  useEffect(() => {
    if (!activeResizer) return

    function handlePointerMove(event) {
      const deltaX = event.clientX - activeResizer.startX
      setPanelSizes(prev => ({
        ...prev,
        [activeResizer.panelId]: clamp(activeResizer.startWidth + deltaX, activeResizer.minWidth, activeResizer.maxWidth),
      }))
    }

    function handlePointerUp() {
      setActiveResizer(null)
    }

    window.addEventListener('pointermove', handlePointerMove)
    window.addEventListener('pointerup', handlePointerUp)
    document.body.style.cursor = 'col-resize'
    document.body.style.userSelect = 'none'

    return () => {
      window.removeEventListener('pointermove', handlePointerMove)
      window.removeEventListener('pointerup', handlePointerUp)
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
    }
  }, [activeResizer])

  useEffect(() => {
    if (typeof window === 'undefined') return
    window.localStorage.setItem(BUILDER_LAYOUT_STORAGE_KEY, JSON.stringify({
      panelOrder,
      panelSizes,
    }))
  }, [panelOrder, panelSizes])

  const selectedWeekKey = getWeekKey(currentWeek, currentYear)
  const sortedWorkouts = useMemo(() => (
    [...workouts].sort(compareWorkoutsBySchedule)
  ), [workouts])

  const groupedWorkouts = useMemo(() => (
    groupWorkoutsByWeekday(sortedWorkouts)
  ), [sortedWorkouts])

  const weekStats = useMemo(() => {
    const totalDuration = workouts.reduce((sum, workout) => sum + estimateWorkoutDuration(workout), 0)
    const totalLoad = workouts.reduce((sum, workout) => sum + estimateWorkoutLoad(workout), 0)
    const totalMechanicalLoad = workouts.reduce((sum, workout) => sum + estimateMechanicalLoad(workout), 0)
    const hardCount = workouts.filter(workout => isHardWorkout(workout)).length
    const easyCount = workouts.length - hardCount

    const distanceByActivity = ACTIVITY_TAGS.map(tag => {
      const total = workouts.reduce((sum, workout) => (
        workout.activityTag === tag.value ? sum + (getWorkoutDistance(workout) || 0) : sum
      ), 0)

      return { ...tag, total }
    }).filter(tag => tag.total > 0)

    return {
      totalDuration,
      totalLoad,
      totalMechanicalLoad,
      hardCount,
      easyCount,
      sessionCount: workouts.length,
      distanceByActivity,
    }
  }, [workouts])

  const dailyLoadChartData = useMemo(() => {
    const days = groupWorkoutsByWeekday(workouts)

    return {
      labels: days.map(day => day.shortLabel),
      datasets: [
        {
          label: 'Load',
          data: days.map(day => day.workouts.reduce((sum, workout) => sum + estimateWorkoutLoad(workout), 0)),
          backgroundColor: 'rgba(37, 99, 235, 0.82)',
          borderRadius: 10,
        },
        {
          label: 'Mekanisk load',
          data: days.map(day => day.workouts.reduce((sum, workout) => sum + estimateMechanicalLoad(workout), 0)),
          backgroundColor: 'rgba(14, 165, 233, 0.42)',
          borderRadius: 10,
        },
      ],
    }
  }, [workouts])

  const distanceDistributionChartData = useMemo(() => ({
    labels: weekStats.distanceByActivity.map(activity => activity.label),
    datasets: [{
      data: weekStats.distanceByActivity.map(activity => Number(activity.total.toFixed(1))),
      backgroundColor: weekStats.distanceByActivity.map(activity => activity.color),
      borderWidth: 0,
    }],
  }), [weekStats.distanceByActivity])

  const loadMixChartData = useMemo(() => {
    const hardLoad = workouts
      .filter(workout => isHardWorkout(workout))
      .reduce((sum, workout) => sum + estimateWorkoutLoad(workout), 0)
    const easyLoad = workouts
      .filter(workout => !isHardWorkout(workout))
      .reduce((sum, workout) => sum + estimateWorkoutLoad(workout), 0)

    return {
      labels: ['Hard belastning', 'Rolig belastning'],
      datasets: [{
        data: [hardLoad, easyLoad],
        backgroundColor: ['#f97316', '#22c55e'],
        borderWidth: 0,
      }],
    }
  }, [workouts])

  const performanceTrend = useMemo(() => {
    const weeklyStats = analysisWeeks.map(week => {
      const weekWorkouts = analysisWorkoutsByWeekKey[week.key] || []
      const distance = weekWorkouts.reduce((sum, workout) => sum + (getWorkoutDistance(workout) || 0), 0)
      const load = weekWorkouts.reduce((sum, workout) => sum + estimateWorkoutLoad(workout), 0)

      return {
        week,
        load,
        distance,
      }
    })

    const loadSeries = weeklyStats.map(week => week.load)
    const weeksWithSignals = weeklyStats.map((week, index) => {
      const acuteLoad = averageLastValues(loadSeries, 3, index)
      const chronicLoad = averageLastValues(loadSeries, 6, index)
      const trainingReadiness = safeDivide(acuteLoad, chronicLoad)

      return {
        ...week,
        acuteLoad,
        trainingReadiness,
      }
    })

    const currentIndex = weeksWithSignals.findIndex(week => (
      week.week.week === currentWeek && week.week.year === currentYear
    ))

    return {
      currentIndex,
      weeklyStats: weeksWithSignals,
    }
  }, [analysisWeeks, analysisWorkoutsByWeekKey, currentWeek, currentYear])

  const trendChartData = useMemo(() => {
    const labels = performanceTrend.weeklyStats.map(entry => `Uke ${entry.week.week}`)

    return {
      labels,
      datasets: [
        {
          label: 'Acute load',
          data: performanceTrend.weeklyStats.map(week => Number(week.acuteLoad.toFixed(1))),
          borderColor: '#f97316',
          backgroundColor: 'rgba(249, 115, 22, 0.14)',
          fill: true,
          tension: 0.3,
          pointRadius: context => context.dataIndex === performanceTrend.currentIndex ? 4 : 2,
        },
        {
          label: 'Km',
          data: performanceTrend.weeklyStats.map(week => Number(week.distance.toFixed(1))),
          borderColor: '#2563eb',
          tension: 0.28,
          pointRadius: context => context.dataIndex === performanceTrend.currentIndex ? 4 : 2,
        },
        {
          label: 'Training readiness',
          data: performanceTrend.weeklyStats.map(week => Number(week.trainingReadiness.toFixed(2))),
          borderColor: '#7c3aed',
          borderDash: [6, 6],
          tension: 0.22,
          pointRadius: context => context.dataIndex === performanceTrend.currentIndex ? 4 : 2,
          yAxisID: 'y1',
        },
      ],
    }
  }, [performanceTrend])

  const focusTrendWeek = performanceTrend.weeklyStats[performanceTrend.currentIndex] || null

  function prevWeek() {
    const previous = getAdjacentWeek(currentWeek, currentYear, -1)
    onWeekChange(previous.week, previous.year)
  }

  function nextWeek() {
    const next = getAdjacentWeek(currentWeek, currentYear, 1)
    onWeekChange(next.week, next.year)
  }

  function handleTemplateDragStart(template, event) {
    if (event?.dataTransfer) {
      event.dataTransfer.effectAllowed = 'copy'
      try { event.dataTransfer.setData('text/plain', `template:${template.id || ''}`) } catch {}
    }
    setDragState({ kind: 'template', template })
    setDropTarget(null)
  }

  function handleWorkoutDragStart(workout, event) {
    if (event?.dataTransfer) {
      event.dataTransfer.effectAllowed = 'move'
      try { event.dataTransfer.setData('text/plain', `workout:${workout.id}`) } catch {}
    }
    setDragState({ kind: 'workout', workoutId: workout.id })
    setDropTarget({
      weekday: workout.weekday,
      beforeWorkoutId: workout.id,
    })
  }

  function handleDragEnd() {
    setDragState(null)
    setDropTarget(null)
  }

  function handleDropTargetChange(weekday, beforeWorkoutId = null) {
    if (!dragState) return
    setDropTarget({ weekday, beforeWorkoutId })
  }

  async function handleDrop(weekday, beforeWorkoutId = null) {
    if (!dragState) return

    const activeDrag = dragState
    setDragState(null)
    setDropTarget(null)

    if (activeDrag.kind === 'template') {
      await onAddTemplateToDay(activeDrag.template, weekday, beforeWorkoutId)
      return
    }

    await onMoveWorkoutByDrag(activeDrag.workoutId, weekday, beforeWorkoutId)
  }

  async function handleTrashDrop() {
    if (!dragState) return

    const activeDrag = dragState
    setDragState(null)
    setDropTarget(null)

    if (activeDrag.kind !== 'workout') return

    const draggedWorkout = workouts.find(workout => workout.id === activeDrag.workoutId)
    if (!draggedWorkout) return

    await onDeleteWorkout(draggedWorkout)
  }

  function handleAddTemplateClick(template) {
    const today = new Date()
    const todayWeekday = ((today.getDay() + 6) % 7) + 1
    const targetWeekday = isThisWeek ? todayWeekday : 1
    return onAddTemplateToDay(template, targetWeekday)
  }

  function handleAddBankWindow() {
    setBankWindows(prev => [
      ...prev,
      { id: `bank-window-${Date.now()}-${prev.length + 1}` },
    ])
  }

  function handleRemoveBankWindow(windowId) {
    setBankWindows(prev => prev.filter(window => window.id !== windowId))
  }

  function movePanel(panelId, direction) {
    setPanelOrder(prev => {
      const visibleOrder = prev.filter(id => visiblePanelIds.includes(id))
      const currentIndex = visibleOrder.indexOf(panelId)
      if (currentIndex < 0) return prev
      const nextIndex = currentIndex + direction
      if (nextIndex < 0 || nextIndex >= visibleOrder.length) return prev

      const swapped = [...visibleOrder]
      ;[swapped[currentIndex], swapped[nextIndex]] = [swapped[nextIndex], swapped[currentIndex]]

      const swappedSet = new Set(swapped)
      const remaining = prev.filter(id => !swappedSet.has(id))
      return [...swapped, ...remaining]
    })
  }

  function getPanelShellStyle(panelId) {
    if (!isDesktopBuilder) return undefined
    return {
      width: `${panelSizes[panelId] || DEFAULT_PANEL_SIZES[panelId]}px`,
    }
  }

  function startResize(panelId, event) {
    event.preventDefault()
    setActiveResizer({
      panelId,
      startX: event.clientX,
      startWidth: panelSizes[panelId] || DEFAULT_PANEL_SIZES[panelId],
      minWidth: panelId === 'calendar' ? 780 : 280,
      maxWidth: 1600,
    })
  }

  const bankPanel = (
    <aside className="pb-panel pb-panel--bank">
      <BuilderPanelHeader
        title="Øktvelger"
        panelId="bank"
        visiblePanelIds={visiblePanelIds}
        onMove={movePanel}
      >
        {onCreateTemplate && (
          <button type="button" className="pb-mini-btn" onClick={onCreateTemplate}>
            + Ny mal
          </button>
        )}
        <button type="button" className="pb-mini-btn" onClick={handleAddBankWindow}>
          + Vindu
        </button>
      </BuilderPanelHeader>

      {loadingTemplates ? (
        <div className="pb-empty-state">Laster økter…</div>
      ) : (
        <div className="pb-bank-grid">
          <BankPickerWindow
            isPrimary
            templates={templates}
            onDragStart={handleTemplateDragStart}
            onDragEnd={handleDragEnd}
            onAddTemplate={handleAddTemplateClick}
            canRemove={false}
            onRemove={() => {}}
            onEditTemplate={onEditTemplate}
            onDeleteTemplate={onDeleteTemplate}
            visibleActivities={visibleActivities}
            onAddActivity={addVisibleActivity}
            onRemoveActivity={removeVisibleActivity}
          />
        </div>
      )}
    </aside>
  )

  const extraPanel = bankWindows.length > 0 ? (
    <aside className="pb-panel pb-panel--extra">
      <BuilderPanelHeader
        title="Vinduer"
        panelId="extra"
        visiblePanelIds={visiblePanelIds}
        onMove={movePanel}
      />

      <div className="pb-extra-list">
        {bankWindows.map((window, index) => (
          <BankPickerWindow
            key={window.id}
            windowNumber={index + 2}
            templates={templates}
            onDragStart={handleTemplateDragStart}
            onDragEnd={handleDragEnd}
            onAddTemplate={handleAddTemplateClick}
            canRemove
            onRemove={() => handleRemoveBankWindow(window.id)}
            onEditTemplate={onEditTemplate}
            onDeleteTemplate={onDeleteTemplate}
            visibleActivities={visibleActivities}
            onAddActivity={addVisibleActivity}
            onRemoveActivity={removeVisibleActivity}
          />
        ))}
      </div>
    </aside>
  ) : null

  const calendarPanel = (
    <main className="pb-panel pb-panel--calendar">
      <BuilderPanelHeader
        title={workoutLayout === 'calendar' ? 'Kalender' : 'Liste'}
        copy={workoutLayout === 'calendar'
          ? 'Slipp økter på ønsket dag. Eksisterende økter kan også dras mellom dager.'
          : 'Sortert etter dag og tidspunkt. Dra økter for å flytte eller slipp foran en økt for å plassere den i listen.'}
        panelId="calendar"
        visiblePanelIds={visiblePanelIds}
        onMove={movePanel}
      />

      {loadingWorkouts ? (
        <div className="pb-empty-state">Laster uke…</div>
      ) : workoutLayout === 'calendar' ? (
        <div className="pb-calendar-days">
          {groupedWorkouts.map(day => (
            <section
              key={day.value}
              className={`pb-day${dropTarget?.weekday === day.value ? ' is-target' : ''}`}
              onDragOver={event => {
                if (!dragState) return
                event.preventDefault()
                if (event.dataTransfer) {
                  event.dataTransfer.dropEffect = dragState.kind === 'template' ? 'copy' : 'move'
                }
                handleDropTargetChange(day.value)
              }}
              onDrop={async event => {
                event.preventDefault()
                await handleDrop(day.value)
              }}
            >
              <header className="pb-day-head">
                <div className="pb-day-titles">
                  <h3 className="pb-day-title">{day.label}</h3>
                  <div className="pb-day-meta">
                    {day.workouts.length > 0 ? `${day.workouts.length} økt${day.workouts.length > 1 ? 'er' : ''}` : 'Ingen økter'}
                  </div>
                </div>
              </header>

              <div className="pb-day-slots">
                {day.workouts.length === 0 ? (
                  <div
                    className={`pb-empty-slot${dropTarget?.weekday === day.value && !dropTarget?.beforeWorkoutId ? ' is-target' : ''}`}
                    onDragOver={event => {
                      if (!dragState) return
                      event.preventDefault()
                      event.stopPropagation()
                      if (event.dataTransfer) {
                        event.dataTransfer.dropEffect = dragState.kind === 'template' ? 'copy' : 'move'
                      }
                      handleDropTargetChange(day.value)
                    }}
                    onDrop={async event => {
                      event.preventDefault()
                      event.stopPropagation()
                      await handleDrop(day.value)
                    }}
                  >
                    Slipp økt her
                  </div>
                ) : (
                  <>
                    {day.workouts.map((workout, index) => (
                      <BuilderWorkoutSlot
                        key={workout.id}
                        workout={workout}
                        index={index}
                        total={day.workouts.length}
                        isDragging={dragState?.kind === 'workout' && dragState.workoutId === workout.id}
                        isDropTarget={dropTarget?.weekday === day.value && dropTarget?.beforeWorkoutId === workout.id}
                        onClick={() => onSelectWorkout(workout)}
                        onMoveUp={() => onMoveWorkout(workout, -1)}
                        onMoveDown={() => onMoveWorkout(workout, 1)}
                        onDragStart={event => handleWorkoutDragStart(workout, event)}
                        onDragEnd={handleDragEnd}
                        onDragOver={event => {
                          if (!dragState) return
                          event.preventDefault()
                          event.stopPropagation()
                          if (event.dataTransfer) {
                            event.dataTransfer.dropEffect = dragState.kind === 'template' ? 'copy' : 'move'
                          }
                          handleDropTargetChange(day.value, workout.id)
                        }}
                        onDrop={async event => {
                          event.preventDefault()
                          event.stopPropagation()
                          await handleDrop(day.value, workout.id)
                        }}
                      />
                    ))}
                  </>
                )}
              </div>
            </section>
          ))}
        </div>
      ) : sortedWorkouts.length === 0 ? (
        <div className="pb-empty-state">Ingen økter denne uken</div>
      ) : (
        <div className="pb-workout-list">
          {sortedWorkouts.map((workout, index) => (
            <BuilderWorkoutSlot
              key={workout.id}
              workout={workout}
              index={index}
              total={sortedWorkouts.length}
              isDragging={dragState?.kind === 'workout' && dragState.workoutId === workout.id}
              isDropTarget={dropTarget?.weekday === workout.weekday && dropTarget?.beforeWorkoutId === workout.id}
              onClick={() => onSelectWorkout(workout)}
              onMoveUp={() => onMoveWorkout(workout, -1)}
              onMoveDown={() => onMoveWorkout(workout, 1)}
              onDragStart={event => handleWorkoutDragStart(workout, event)}
              onDragEnd={handleDragEnd}
              onDragOver={event => {
                if (!dragState) return
                event.preventDefault()
                event.stopPropagation()
                if (event.dataTransfer) {
                  event.dataTransfer.dropEffect = dragState.kind === 'template' ? 'copy' : 'move'
                }
                handleDropTargetChange(workout.weekday, workout.id)
              }}
              onDrop={async event => {
                event.preventDefault()
                event.stopPropagation()
                await handleDrop(workout.weekday, workout.id)
              }}
            />
          ))}
        </div>
      )}
    </main>
  )

  const insightsPanel = (
    <aside className="pb-panel pb-panel--insights">
      <BuilderPanelHeader
        title="Ukeoversikt"
        copy="Belastning og distanse oppdateres fortløpende."
        panelId="insights"
        visiblePanelIds={visiblePanelIds}
        onMove={movePanel}
      />

      <div className="pb-metric-grid">
        <MetricCard label="Økter" value={String(weekStats.sessionCount)} helper={`${weekStats.hardCount} harde / ${weekStats.easyCount} rolige`} />
        <MetricCard label="Tid" value={formatDurationLabel(weekStats.totalDuration)} helper="Estimert" />
        <MetricCard label="Load" value={String(weekStats.totalLoad)} helper="Tid × intensitet" />
        <MetricCard label="Mek. load" value={String(weekStats.totalMechanicalLoad)} helper="Aktivitet × distanse" />
      </div>

      <div className="pb-distance">
        <div className="pb-section-title">Distanse per aktivitet</div>
        {weekStats.distanceByActivity.length === 0 ? (
          <div className="pb-empty-copy">Ingen distanse registrert ennå denne uken.</div>
        ) : (
          <ul className="pb-distance-list">
            {weekStats.distanceByActivity.map(activity => (
              <li key={activity.value} className="pb-distance-row">
                <span className="pb-distance-label">
                  <span className="pb-card-icon"><ActivityIcon name={activity.icon} className="tag-icon-svg" /></span>
                  <span>{activity.label}</span>
                </span>
                <strong className="tp-num">{formatKmValue(activity.total)}</strong>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="pb-chart">
        <div className="pb-section-title">Belastning per dag</div>
        <div className="pb-chart-shell">
          <Bar data={dailyLoadChartData} options={builderChartOptions} />
        </div>
      </div>

      <div className="pb-chart">
        <div className="pb-section-title">Trend rundt valgt uke</div>
        <p className="pb-chart-copy">
          Noen uker før og etter med acute load, km og readiness.
        </p>
        {loadingAnalysis ? (
          <div className="pb-empty-copy">Laster trend…</div>
        ) : (
          <>
            <div className="pb-trend-summary">
              <span>Acute <strong className="tp-num">{Math.round(focusTrendWeek?.acuteLoad || 0)}</strong></span>
              <span>Km <strong className="tp-num">{Number((focusTrendWeek?.distance || 0).toFixed(1))}</strong></span>
              <span>Readiness <strong className="tp-num">{Number((focusTrendWeek?.trainingReadiness || 0).toFixed(2))}</strong></span>
            </div>
            <div className="pb-chart-shell pb-chart-shell--tall">
              <Line data={trendChartData} options={trendChartOptions} />
            </div>
          </>
        )}
      </div>

      <div className="pb-chart">
        <div className="pb-section-title">Belastningsmiks</div>
        {workouts.length === 0 ? (
          <div className="pb-empty-copy">Legg inn økter for å se fordeling.</div>
        ) : (
          <div className="pb-chart-shell">
            <Doughnut data={loadMixChartData} options={doughnutOptions} />
          </div>
        )}
      </div>

      <div className="pb-chart">
        <div className="pb-section-title">Distansefordeling</div>
        {weekStats.distanceByActivity.length === 0 ? (
          <div className="pb-empty-copy">Ingen distanse for denne uken.</div>
        ) : (
          <div className="pb-chart-shell">
            <Doughnut data={distanceDistributionChartData} options={doughnutOptions} />
          </div>
        )}
      </div>

      <div className="pb-generator">
        <div className="pb-section-title">Automatisk generering</div>
        <p className="pb-empty-copy">Plassholder for automatisk generering av treningsplan. Kommer i neste iterasjon.</p>
        <button type="button" className="pb-mini-btn" disabled>
          Generer plan senere
        </button>
      </div>
    </aside>
  )

  const panelMap = {
    bank: bankPanel,
    extra: extraPanel,
    calendar: calendarPanel,
    insights: insightsPanel,
  }

  return (
    <div className="pb-shell">
      {selectedAthleteName && (
        <div className="pb-athlete-banner">
          Planbygger for <strong>{selectedAthleteName}</strong>
        </div>
      )}

      <WeekNav
        week={currentWeek}
        year={currentYear}
        monday={monday}
        sunday={sunday}
        isThisWeek={isThisWeek}
        onPrev={prevWeek}
        onNext={nextWeek}
        onToday={() => onWeekChange(getWeekNumber(new Date()), new Date().getFullYear())}
        rightSlot={
          <IconButton
            ariaLabel="Vis ukeoversikt"
            variant={showOverview ? undefined : 'ghost'}
            onClick={() => setShowOverview(p => !p)}
          >
            <span className="pb-overview-glyph" aria-hidden="true"><span /><span /><span /><span /></span>
          </IconButton>
        }
      />

      {showOverview && (
        loadingOverview ? (
          <div className="pb-overview-loading" id="admin-builder-overview">Laster ukeoversikt…</div>
        ) : (
          <div className="pb-overview-wrap" id="admin-builder-overview">
            <BirdsEyeOverview
              weeks={overviewWeeks}
              workoutsByWeekKey={overviewWorkoutsByWeekKey}
              selectedWeekKey={selectedWeekKey}
              onSelectWeek={(week, year) => {
                onWeekChange(week, year)
                setShowOverview(false)
              }}
            />
          </div>
        )
      )}

      <div className={`pb-layout${isDesktopBuilder ? ' is-desktop' : ''}`} style={builderLayoutStyle}>
        {visiblePanelIds.map(panelId => (
          <section
            key={panelId}
            className={`pb-panel-shell pb-panel-${panelId}`}
            style={getPanelShellStyle(panelId)}
          >
            {panelMap[panelId]}
            {isDesktopBuilder && (
              <button
                type="button"
                className="pb-resize-handle"
                aria-label={`Juster bredde for ${panelId}`}
                onPointerDown={event => startResize(panelId, event)}
              />
            )}
          </section>
        ))}
      </div>

      {dragState?.kind === 'workout' && (
        <div
          className="pb-trash"
          onDragOver={event => {
            event.preventDefault()
            if (event.dataTransfer) event.dataTransfer.dropEffect = 'move'
          }}
          onDrop={async event => {
            event.preventDefault()
            await handleTrashDrop()
          }}
        >
          <SystemIcon name="delete" className="system-icon" />
          <span>Slipp her for å slette økten</span>
        </div>
      )}
    </div>
  )
}

function BuilderPanelHeader({ title, copy, panelId, visiblePanelIds, onMove, children }) {
  const panelIndex = visiblePanelIds.indexOf(panelId)
  const canMoveLeft = panelIndex > 0
  const canMoveRight = panelIndex >= 0 && panelIndex < visiblePanelIds.length - 1

  return (
    <div className="pb-panel-head">
      <div className="pb-panel-titles">
        <h2 className="pb-panel-title">{title}</h2>
        {copy ? <p className="pb-panel-copy">{copy}</p> : null}
      </div>
      <div className="pb-panel-tools">
        <div className="pb-panel-move">
          <button type="button" className="pb-panel-move-btn" onClick={() => onMove(panelId, -1)} disabled={!canMoveLeft} aria-label={`Flytt ${title} til venstre`}>
            ←
          </button>
          <button type="button" className="pb-panel-move-btn" onClick={() => onMove(panelId, 1)} disabled={!canMoveRight} aria-label={`Flytt ${title} til høyre`}>
            →
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}

function SessionColumn({ title, subtitle, sessions, onDragStart, onDragEnd, onAddTemplate, onEditTemplate, onDeleteTemplate }) {
  return (
    <section className="pb-column">
      <header className="pb-column-head">
        <h3 className="pb-column-title">{title}</h3>
        <span className="pb-column-count">{subtitle}</span>
      </header>

      {sessions.length === 0 ? (
        <div className="pb-empty-copy">Ingen økter i denne kolonnen.</div>
      ) : (
        <div className="pb-card-list">
          {sessions.map(session => (
            <TemplateDragCard
              key={session.id}
              session={session}
              onDragStart={event => onDragStart(session, event)}
              onDragEnd={onDragEnd}
              onAdd={onAddTemplate}
              onEdit={onEditTemplate}
              onDelete={onDeleteTemplate}
            />
          ))}
        </div>
      )}
    </section>
  )
}

function BankPickerWindow({
  windowNumber,
  isPrimary = false,
  templates,
  onDragStart,
  onDragEnd,
  onAddTemplate,
  canRemove,
  onRemove,
  onEditTemplate,
  onDeleteTemplate,
  visibleActivities = DEFAULT_VISIBLE_ACTIVITIES,
  onAddActivity,
  onRemoveActivity,
}) {
  const [activeTagFilter, setActiveTagFilter] = useState(null)
  const [activeIntensityFilters, setActiveIntensityFilters] = useState([])
  const [showActivityPicker, setShowActivityPicker] = useState(false)

  const visibleTags = useMemo(() => (
    visibleActivities
      .map(value => ACTIVITY_TAG_MAP[value])
      .filter(Boolean)
  ), [visibleActivities])

  const hiddenTags = useMemo(() => (
    ACTIVITY_TAGS.filter(tag => !visibleActivities.includes(tag.value))
  ), [visibleActivities])

  useEffect(() => {
    if (activeTagFilter && !visibleActivities.includes(activeTagFilter)) {
      setActiveTagFilter(null)
    }
  }, [activeTagFilter, visibleActivities])

  useEffect(() => {
    if (!showActivityPicker) return
    function handleDocClick(event) {
      if (!event.target.closest?.('.pb-activity-picker')) {
        setShowActivityPicker(false)
      }
    }
    document.addEventListener('mousedown', handleDocClick)
    return () => document.removeEventListener('mousedown', handleDocClick)
  }, [showActivityPicker])

  const filteredTemplates = useMemo(() => (
    templates
      .filter(template => !template.activityTag || visibleActivities.includes(template.activityTag))
      .filter(template => !activeTagFilter || template.activityTag === activeTagFilter)
      .filter(template => {
        if (activeIntensityFilters.length === 0) return true
        const zones = normalizeIntensityZones(template.type, template.intensityZone)
        return activeIntensityFilters.some(zone => zones.includes(zone))
      })
      .sort((a, b) => a.title.localeCompare(b.title, 'nb'))
  ), [activeIntensityFilters, activeTagFilter, templates, visibleActivities])

  const hardTemplates = useMemo(() => (
    filteredTemplates.filter(template => isHardWorkout(template))
  ), [filteredTemplates])

  const easyTemplates = useMemo(() => (
    filteredTemplates.filter(template => !isHardWorkout(template))
  ), [filteredTemplates])

  function toggleIntensityFilter(zone) {
    setActiveIntensityFilters(prev => (
      prev.includes(zone)
        ? prev.filter(currentZone => currentZone !== zone)
        : [...prev, zone].sort((a, b) => a - b)
    ))
  }

  return (
    <section className="pb-picker">
      {!isPrimary && (
        <header className="pb-picker-head">
          <div>
            <h3 className="pb-column-title">Vindu {windowNumber}</h3>
            <span className="pb-column-count">{filteredTemplates.length} økter</span>
          </div>
          {canRemove ? (
            <button type="button" className="pb-mini-btn pb-mini-btn--icon" onClick={onRemove} aria-label="Lukk vindu">×</button>
          ) : null}
        </header>
      )}

      <div className="pb-filter-row">
        <button
          type="button"
          className={`pb-filter-chip${!activeTagFilter ? ' is-active' : ''}`}
          onClick={() => setActiveTagFilter(null)}
        >Alle</button>
        {visibleTags.map(tag => {
          const isPinned = PINNED_ACTIVITY_TAGS.includes(tag.value)
          return (
            <span key={tag.value} className="pb-filter-chip-wrap">
              <button
                type="button"
                className={`pb-filter-chip${activeTagFilter === tag.value ? ' is-active' : ''}`}
                onClick={() => setActiveTagFilter(activeTagFilter === tag.value ? null : tag.value)}
              >
                <span className="pb-filter-icon" aria-hidden="true"><ActivityIcon name={tag.icon} className="tag-icon-svg" /></span>
                <span>{tag.label}</span>
              </button>
              {!isPinned && onRemoveActivity ? (
                <button
                  type="button"
                  className="pb-filter-chip-remove"
                  onClick={() => onRemoveActivity(tag.value)}
                  aria-label={`Skjul ${tag.label}`}
                  title={`Skjul ${tag.label}`}
                >×</button>
              ) : null}
            </span>
          )
        })}
        {hiddenTags.length > 0 && onAddActivity ? (
          <div className="pb-activity-picker">
            <button
              type="button"
              className="pb-filter-chip pb-filter-chip--add"
              onClick={() => setShowActivityPicker(value => !value)}
              aria-expanded={showActivityPicker}
            >+ Aktivitet</button>
            {showActivityPicker ? (
              <div className="pb-activity-menu" role="menu">
                {hiddenTags.map(tag => (
                  <button
                    key={tag.value}
                    type="button"
                    role="menuitem"
                    className="pb-activity-menu-item"
                    onClick={() => {
                      onAddActivity(tag.value)
                      setShowActivityPicker(false)
                    }}
                  >
                    <span className="pb-filter-icon" aria-hidden="true"><ActivityIcon name={tag.icon} className="tag-icon-svg" /></span>
                    <span>{tag.label}</span>
                  </button>
                ))}
              </div>
            ) : null}
          </div>
        ) : null}
      </div>

      <div className="pb-filter-row">
        <button
          type="button"
          className={`pb-filter-chip${activeIntensityFilters.length === 0 ? ' is-active' : ''}`}
          onClick={() => setActiveIntensityFilters([])}
        >Alle</button>
        {[1, 2, 3, 4, 5].map(zone => (
          <button
            key={zone}
            type="button"
            className={`pb-zone-chip pb-zone-${zone}${activeIntensityFilters.includes(zone) ? ' is-active' : ''}`}
            onClick={() => toggleIntensityFilter(zone)}
          >
            S{zone}
          </button>
        ))}
      </div>

      <div className="pb-picker-grid">
        <SessionColumn
          title="Hardøkter"
          subtitle={`${hardTemplates.length} økter`}
          sessions={hardTemplates}
          onDragStart={onDragStart}
          onDragEnd={onDragEnd}
          onAddTemplate={onAddTemplate}
          onEditTemplate={onEditTemplate}
          onDeleteTemplate={onDeleteTemplate}
        />
        <SessionColumn
          title="Rolige økter"
          subtitle={`${easyTemplates.length} økter`}
          sessions={easyTemplates}
          onDragStart={onDragStart}
          onDragEnd={onDragEnd}
          onAddTemplate={onAddTemplate}
          onEditTemplate={onEditTemplate}
          onDeleteTemplate={onDeleteTemplate}
        />
      </div>
    </section>
  )
}

function TemplateDragCard({ session, onDragStart, onDragEnd, onAdd, onEdit, onDelete }) {
  const icon = TYPE_ICONS[session.type] || 'AN'
  const intensityLabel = formatIntensityZoneLabel(normalizeIntensityZones(session.type, session.intensityZone))
  const isCustomTemplate = session.source === 'custom'

  return (
    <div
      className="pb-card"
      draggable
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
    >
      <div className="pb-card-top">
        <span className="pb-card-icon"><ActivityIcon name={icon} className="tag-icon-svg" /></span>
        <div className="pb-card-actions">
          {onAdd ? (
            <button
              type="button"
              className="pb-card-action pb-card-action--add"
              onClick={event => { event.preventDefault(); event.stopPropagation(); onAdd(session) }}
              draggable={false}
              title="Legg til i plan"
              aria-label={`Legg ${session.title} til i plan`}
            >+</button>
          ) : null}
          {isCustomTemplate && onEdit ? (
            <button
              type="button"
              className="pb-card-action"
              onClick={event => { event.preventDefault(); event.stopPropagation(); onEdit(session) }}
              draggable={false}
              title="Rediger mal"
              aria-label={`Rediger malen ${session.title}`}
            >
              <SystemIcon name="edit" className="system-icon" />
            </button>
          ) : null}
          {isCustomTemplate && onDelete ? (
            <button
              type="button"
              className="pb-card-action pb-card-action--danger"
              onClick={event => { event.preventDefault(); event.stopPropagation(); onDelete(session) }}
              draggable={false}
              title="Slett mal"
              aria-label={`Slett malen ${session.title}`}
            >
              <SystemIcon name="delete" className="system-icon" />
            </button>
          ) : null}
          <span className="pb-card-grip" title="Dra inn i kalender" aria-hidden="true">⋮⋮</span>
        </div>
      </div>
      <div className="pb-card-meta">
        <span className="pb-card-title">{session.title}</span>
        {intensityLabel && <span className="pb-card-zone">{intensityLabel}</span>}
      </div>
    </div>
  )
}

function BuilderWorkoutSlot({
  workout,
  index,
  total,
  isDragging,
  isDropTarget,
  onClick,
  onMoveUp,
  onMoveDown,
  onDragStart,
  onDragEnd,
  onDragOver,
  onDrop,
}) {
  const icon = TYPE_ICONS[workout.type] || 'AN'
  const scheduleLabel = formatWorkoutTime(workout) || formatWorkoutSchedule(workout, { includeWeekday: false })
  const intensityLabel = formatIntensityZoneLabel(normalizeIntensityZones(workout.type, workout.intensityZone))

  return (
    <div
      className={`pb-slot${workout.completed ? ' is-completed' : ''}${isDragging ? ' is-dragging' : ''}${isDropTarget ? ' is-target' : ''}`}
      draggable
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onDragOver={onDragOver}
      onDrop={onDrop}
    >
      <div className="pb-slot-top">
        <span className="pb-card-icon"><ActivityIcon name={icon} className="tag-icon-svg" /></span>
        <div className="pb-slot-actions">
          <span className="pb-card-grip" title="Dra for å flytte" aria-hidden="true">⋮⋮</span>
          <button className="pb-slot-reorder" onClick={onMoveUp} disabled={index === 0} title="Flytt opp"><SystemIcon name="up" className="system-icon" /></button>
          <button className="pb-slot-reorder" onClick={onMoveDown} disabled={index === total - 1} title="Flytt ned"><SystemIcon name="down" className="system-icon" /></button>
        </div>
      </div>

      <button type="button" className="pb-slot-main" onClick={onClick}>
        {scheduleLabel && <span className="pb-slot-time">{scheduleLabel}</span>}
        <span className="pb-slot-title">{workout.title}</span>
        {intensityLabel && <span className="pb-slot-zone">{intensityLabel}</span>}
      </button>
    </div>
  )
}

function MetricCard({ label, value, helper }) {
  return (
    <div className="pb-metric">
      <span className="pb-metric-label">{label}</span>
      <strong className="pb-metric-value tp-num">{value}</strong>
      {helper && <small className="pb-metric-helper">{helper}</small>}
    </div>
  )
}
