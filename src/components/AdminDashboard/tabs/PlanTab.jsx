import { CalendarPlus, Plus } from 'lucide-react'
import { getWeekNumber } from '../../../utils'
import {
  Button,
  EmptyState,
  LayoutToggle,
  Page,
  SportPicker,
  Toolbar,
  ToolbarGroup,
  WeekNav,
} from '../../ui'
import { EMPTY_TEMPLATE } from '../constants'
import AdminWorkoutSlot from '../AdminWorkoutSlot'
import WeekCalendarList from '../../AdminPlanBuilder/WeekCalendarList'

function buildDayDropZone(weekday, draggedWorkoutId, handleDropTargetChange, handleDropWorkout) {
  return {
    onDragOver(e) {
      if (!draggedWorkoutId) return
      e.preventDefault()
      handleDropTargetChange(weekday)
    },
    async onDrop(e) {
      if (!draggedWorkoutId) return
      e.preventDefault()
      await handleDropWorkout(weekday)
    },
  }
}

function buildWorkoutDropZone(weekday, workoutId, handleDropTargetChange, handleDropWorkout) {
  return {
    onDragOver(e) {
      e.preventDefault()
      e.stopPropagation()
      handleDropTargetChange(weekday, workoutId)
    },
    async onDrop(e) {
      e.preventDefault()
      e.stopPropagation()
      await handleDropWorkout(weekday, workoutId)
    },
  }
}

export default function PlanTab(props) {
  const {
    currentWeek, currentYear, monday, sunday, isThisWeek,
    onWeekChange, prevWeek, nextWeek,
    workoutLayout, onWorkoutLayoutChange,
    workouts, filteredWorkouts, groupedWorkouts, loadingWorkouts,
    activeTagFilter, setActiveTagFilter,
    setSelectedWorkout, handleDeleteWorkout, handleStartReplaceWorkout, handleToggleComplete,
    moveWorkout,
    draggedWorkoutId, dropTarget,
    handleDragStart, handleDragEnd, handleDropTargetChange, handleDropWorkout,
    setReplacementTarget, setCustomForm, setShowCustomForm, setPickingFromBank, setTab,
  } = props

  function startNewWorkout() {
    setCustomForm({ ...EMPTY_TEMPLATE })
    setShowCustomForm(true)
  }

  function startPickFromBank() {
    setReplacementTarget(null)
    setCustomForm(prev => ({ ...prev, weekday: '' }))
    setPickingFromBank(true)
    setTab('oktbank')
  }

  return (
    <Page>
      <WeekNav
        week={currentWeek}
        year={currentYear}
        monday={monday}
        sunday={sunday}
        isThisWeek={isThisWeek}
        onPrev={prevWeek}
        onNext={nextWeek}
        onToday={() => onWeekChange(getWeekNumber(new Date()), new Date().getFullYear())}
      />

      <Toolbar>
        {workoutLayout !== 'calendar' && (
          <ToolbarGroup label="Add">
            <Button variant="secondary" size="sm" onClick={startPickFromBank}>
              <CalendarPlus size={16} strokeWidth={2} aria-hidden="true" />
              From session bank
            </Button>
            <Button size="sm" onClick={startNewWorkout}>
              <Plus size={16} strokeWidth={2} aria-hidden="true" />
              New session
            </Button>
          </ToolbarGroup>
        )}
        <ToolbarGroup label="View">
          <LayoutToggle value={workoutLayout} onChange={onWorkoutLayoutChange} />
        </ToolbarGroup>
        <ToolbarGroup label="Activity">
          <SportPicker
            value={activeTagFilter ? [activeTagFilter] : []}
            onChange={(next) => setActiveTagFilter(next.length ? next[next.length - 1] : null)}
            limitToValues={Array.from(new Set(workouts.map(w => w.activityTag).filter(Boolean)))}
          />
        </ToolbarGroup>
      </Toolbar>

      <div className="pb-plan-list">
        {loadingWorkouts ? (
          <EmptyState title="Loading…" />
        ) : filteredWorkouts.length === 0 ? (
          <EmptyState
            title={activeTagFilter ? 'No sessions match selected activity' : 'No sessions this week'}
            description={activeTagFilter ? 'Try removing the activity filter.' : 'Add a session from the session bank or create a new one.'}
            action={activeTagFilter ? (
              <Button variant="secondary" onClick={() => setActiveTagFilter(null)}>Remove filter</Button>
            ) : (
              <Button onClick={startNewWorkout}>
                <Plus size={16} strokeWidth={2} aria-hidden="true" />
                New session
              </Button>
            )}
          />
        ) : workoutLayout === 'calendar' ? (
          <WeekCalendarList
            days={groupedWorkouts}
            isWorkoutDragging={w => draggedWorkoutId === w.id}
            isWorkoutDropTarget={(w, day) => dropTarget?.weekday === day && dropTarget?.beforeWorkoutId === w.id}
            isDayEndTarget={day => dropTarget?.weekday === day && !dropTarget?.beforeWorkoutId}
            getDayDropZoneProps={day => buildDayDropZone(day, draggedWorkoutId, handleDropTargetChange, handleDropWorkout)}
            getWorkoutDropZoneProps={(w, day) => buildWorkoutDropZone(day, w.id, handleDropTargetChange, handleDropWorkout)}
            onSelectWorkout={setSelectedWorkout}
            onMoveWorkout={moveWorkout}
            onWorkoutDragStart={w => handleDragStart(w)}
            onWorkoutDragEnd={handleDragEnd}
            onReplaceWorkout={handleStartReplaceWorkout}
            onToggleCompleteWorkout={handleToggleComplete}
            onDeleteWorkout={handleDeleteWorkout}
          />
        ) : (
          <div className="pb-workout-list">
            {filteredWorkouts.map((workout, index) => (
              <AdminWorkoutSlot
                key={workout.id}
                workout={workout}
                index={index}
                total={filteredWorkouts.length}
                onClick={setSelectedWorkout}
                onDelete={handleDeleteWorkout}
                onReplace={handleStartReplaceWorkout}
                onToggleComplete={handleToggleComplete}
                onMoveUp={() => moveWorkout(workout, -1)}
                onMoveDown={() => moveWorkout(workout, 1)}
                isDragging={draggedWorkoutId === workout.id}
                isDropTarget={dropTarget?.beforeWorkoutId === workout.id}
                onDragStart={() => handleDragStart(workout)}
                onDragEnd={handleDragEnd}
                onDragOver={e => {
                  e.preventDefault()
                  e.stopPropagation()
                  handleDropTargetChange(workout.weekday, workout.id)
                }}
                onDrop={async e => {
                  e.preventDefault()
                  e.stopPropagation()
                  await handleDropWorkout(workout.weekday, workout.id)
                }}
              />
            ))}
          </div>
        )}
      </div>
    </Page>
  )
}
