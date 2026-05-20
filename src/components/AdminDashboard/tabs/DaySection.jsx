import { CalendarPlus, Plus } from 'lucide-react'
import AdminWorkoutSlot from '../AdminWorkoutSlot'
import { EMPTY_TEMPLATE } from '../constants'

export default function DaySection({
  day,
  setReplacementTarget, setCustomForm, setPickingFromBank, setTab, setShowCustomForm,
  setSelectedWorkout, handleDeleteWorkout, handleStartReplaceWorkout, handleToggleComplete,
  moveWorkout, draggedWorkoutId, dropTarget,
  handleDragStart, handleDragEnd, handleDropTargetChange, handleDropWorkout,
}) {
  return (
    <section className="pb-day">
      <header className="pb-day-head">
        <div className="pb-day-titles">
          <h2 className="pb-day-title">{day.label}</h2>
          <div className="pb-day-meta">
            {day.workouts.length > 0 ? `${day.workouts.length} økt${day.workouts.length > 1 ? 'er' : ''}` : 'Ingen økter'}
          </div>
        </div>
        <div className="pb-day-actions">
          <button
            type="button"
            className="pb-mini-btn"
            aria-label={`Legg til økt fra øktbank på ${day.label}`}
            onClick={() => {
              setReplacementTarget(null)
              setCustomForm(prev => ({ ...prev, weekday: day.value }))
              setPickingFromBank(true)
              setTab('oktbank')
            }}
          >
            <CalendarPlus size={14} strokeWidth={2} aria-hidden="true" />
            Fra øktbank
          </button>
          <button
            type="button"
            className="pb-mini-btn pb-mini-btn--solid"
            aria-label={`Ny økt på ${day.label}`}
            onClick={() => {
              setCustomForm({ ...EMPTY_TEMPLATE, weekday: day.value })
              setShowCustomForm(true)
            }}
          >
            <Plus size={14} strokeWidth={2} aria-hidden="true" />
            Ny økt
          </button>
        </div>
      </header>

      {day.workouts.length === 0 ? (
        <div className="pb-day-slots">
          <div className="pb-empty-slot">Ledig slot</div>
        </div>
      ) : (
        <div className="pb-day-slots">
          {day.workouts.map((workout, idx) => (
            <AdminWorkoutSlot
              key={workout.id}
              workout={workout}
              index={idx}
              total={day.workouts.length}
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
                handleDropTargetChange(day.value, workout.id)
              }}
              onDrop={async e => {
                e.preventDefault()
                e.stopPropagation()
                await handleDropWorkout(day.value, workout.id)
              }}
            />
          ))}
        </div>
      )}

      <div
        className={`pb-day-dropzone${
          dropTarget?.weekday === day.value && !dropTarget?.beforeWorkoutId ? ' is-target' : ''
        }`}
        onDragOver={e => {
          e.preventDefault()
          handleDropTargetChange(day.value)
        }}
        onDrop={async e => {
          e.preventDefault()
          await handleDropWorkout(day.value)
        }}
      >
        Slipp her for å legge økten sist denne dagen
      </div>
    </section>
  )
}
