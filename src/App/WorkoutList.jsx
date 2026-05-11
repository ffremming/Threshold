import { Section, EmptyState, WorkoutCard } from '../components/ui'

export default function WorkoutList({
  loading,
  workouts,
  workoutDays,
  doneCount,
  homeWorkoutLayout,
  canManageWorkouts,
  activeHomeAthlete,
  setSelectedWorkout,
  handleToggleComplete,
}) {
  if (loading) return <EmptyState title="Laster økter…" />
  if (workouts.length === 0) {
    return (
      <EmptyState
        icon="•"
        title="Ingen økter denne uken"
        description={canManageWorkouts && activeHomeAthlete?.displayName ? `Ingen økter for ${activeHomeAthlete.displayName}.` : 'Sjekk en annen uke eller spør treneren din.'}
      />
    )
  }

  return (
    <>
      <Section padded>
        <div className="ah-summary">
          <div className="ah-summary-text">
            <span className="tp-num">{doneCount}/{workouts.length}</span> fullført
          </div>
          <div className="ah-progress" aria-hidden="true">
            <div className="ah-progress-fill" style={{ width: `${(doneCount / workouts.length) * 100}%` }} />
          </div>
        </div>
      </Section>

      {homeWorkoutLayout === 'calendar' ? (
        <div className="ah-day-list">
          {workoutDays.map(day => (
            <Section
              key={day.value}
              title={day.label}
              subtitle={day.workouts.length > 0 ? `${day.workouts.length} økt${day.workouts.length > 1 ? 'er' : ''}` : 'Hvile / ingen økter'}
            >
              {day.workouts.length === 0 ? (
                <div className="ah-empty-slot">Ledig slot</div>
              ) : (
                <div className="ah-day-stack">
                  {day.workouts.map(workout => (
                    <WorkoutCard
                      key={workout.id}
                      workout={workout}
                      onClick={() => setSelectedWorkout(workout)}
                      onToggleComplete={() => handleToggleComplete(workout)}
                    />
                  ))}
                </div>
              )}
            </Section>
          ))}
        </div>
      ) : (
        <div className="ah-day-stack">
          {workouts.map(workout => (
            <WorkoutCard
              key={workout.id}
              workout={workout}
              onClick={() => setSelectedWorkout(workout)}
              onToggleComplete={() => handleToggleComplete(workout)}
              showSchedule={false}
            />
          ))}
        </div>
      )}
    </>
  )
}
