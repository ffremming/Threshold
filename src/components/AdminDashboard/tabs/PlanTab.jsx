import { CalendarPlus, Plus } from 'lucide-react'
import { getWeekNumber } from '../../../utils'
import BirdsEyeOverview from '../../BirdsEyeOverview'
import {
  Button,
  EmptyState,
  IconButton,
  LayoutToggle,
  Page,
  SportPicker,
  Toolbar,
  ToolbarGroup,
  WeekNav,
} from '../../ui'
import { EMPTY_TEMPLATE } from '../constants'
import AdminWorkoutSlot from '../AdminWorkoutSlot'
import DaySection from './DaySection'

export default function PlanTab(props) {
  const {
    selectedAthleteName,
    currentWeek, currentYear, monday, sunday, isThisWeek,
    onWeekChange, prevWeek, nextWeek,
    showOverview, setShowOverview, loadingOverview,
    overviewWeeks, overviewWorkoutsByWeekKey, selectedWeekKey,
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
      {selectedAthleteName && (
        <div className="pb-athlete-banner">
          Treningsplan for <strong>{selectedAthleteName}</strong>
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
          <div className="pb-overview-loading" id="admin-birds-eye-overview">Laster mengdeoversikt…</div>
        ) : (
          <div className="pb-overview-wrap" id="admin-birds-eye-overview">
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

      <Toolbar>
        <ToolbarGroup label="Legg til">
          <Button variant="secondary" size="sm" onClick={startPickFromBank}>
            <CalendarPlus size={16} strokeWidth={2} aria-hidden="true" />
            Fra øktbank
          </Button>
          <Button size="sm" onClick={startNewWorkout}>
            <Plus size={16} strokeWidth={2} aria-hidden="true" />
            Ny økt
          </Button>
        </ToolbarGroup>
        <ToolbarGroup label="Visning">
          <LayoutToggle value={workoutLayout} onChange={onWorkoutLayoutChange} />
        </ToolbarGroup>
        <ToolbarGroup label="Aktivitet">
          <SportPicker
            value={activeTagFilter ? [activeTagFilter] : []}
            onChange={(next) => setActiveTagFilter(next.length ? next[next.length - 1] : null)}
            limitToValues={Array.from(new Set(workouts.map(w => w.activityTag).filter(Boolean)))}
          />
        </ToolbarGroup>
      </Toolbar>

      <div className="pb-plan-list">
        {loadingWorkouts ? (
          <EmptyState title="Laster…" />
        ) : filteredWorkouts.length === 0 ? (
          <EmptyState
            title={activeTagFilter ? 'Ingen økter matcher valgt aktivitet' : 'Ingen økter denne uken'}
            description={activeTagFilter ? 'Prøv å fjerne aktivitetsfilteret.' : 'Legg til en økt fra øktbanken eller opprett en ny.'}
            action={activeTagFilter ? (
              <Button variant="secondary" onClick={() => setActiveTagFilter(null)}>Fjern filter</Button>
            ) : (
              <Button onClick={startNewWorkout}>
                <Plus size={16} strokeWidth={2} aria-hidden="true" />
                Ny økt
              </Button>
            )}
          />
        ) : workoutLayout === 'calendar' ? (
          groupedWorkouts.map(day => (
            <DaySection key={day.value} day={day} {...props} />
          ))
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
