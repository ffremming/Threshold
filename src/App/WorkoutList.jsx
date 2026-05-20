import { CalendarX } from 'lucide-react'
import { Section, EmptyState, WorkoutCard } from '../components/ui'

const TYPE_LABELS = {
  rolig: 'rolig',
  molle: 'mølle',
  terskel: 'terskel',
  interval: 'intervall',
  continuous: 'kontinuerlig',
  styrke: 'styrke',
  annet: 'annet',
}

function formatDuration(totalMinutes) {
  if (!totalMinutes) return '0 min'
  const hours = Math.floor(totalMinutes / 60)
  const mins = totalMinutes % 60
  if (hours === 0) return `${mins} min`
  if (mins === 0) return `${hours} t`
  return `${hours} t ${mins} min`
}

function buildTypeBreakdown(workouts) {
  const counts = new Map()
  for (const w of workouts) {
    const key = w.type || 'annet'
    counts.set(key, (counts.get(key) || 0) + 1)
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([type, count]) => `${count} ${TYPE_LABELS[type] || type}`)
    .join(', ')
}

function WeekSummary({ workouts, doneCount }) {
  const totalMinutes = workouts.reduce((sum, w) => sum + (Number(w.duration) || 0), 0)
  const typeBreakdown = buildTypeBreakdown(workouts)
  const progressPct = workouts.length > 0
    ? Math.round((doneCount / workouts.length) * 100)
    : 0

  return (
    <Section padded>
      <div className="ah-week-strip">
        <div className="ah-week-stat">
          <span className="ah-week-stat-value">{formatDuration(totalMinutes)}</span>
          <span className="ah-week-stat-label">planlagt</span>
        </div>
        <div className="ah-week-stat">
          <span className="ah-week-stat-value">{workouts.length}</span>
          <span className="ah-week-stat-label">økter</span>
        </div>
        <div className="ah-week-stat">
          <span className="ah-week-stat-value">{doneCount}</span>
          <span className="ah-week-stat-label">fullført</span>
        </div>
        {typeBreakdown && (
          <div className="ah-week-breakdown" title="Fordeling per type">{typeBreakdown}</div>
        )}
      </div>

      <div className="ah-summary">
        <div className="ah-summary-text">
          <span className="tp-num">{doneCount}/{workouts.length}</span> fullført
        </div>
        <div
          className="ah-progress"
          role="progressbar"
          aria-valuenow={progressPct}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={`${doneCount} av ${workouts.length} økter fullført`}
        >
          <div className="ah-progress-fill" style={{ width: `${progressPct}%` }} />
        </div>
      </div>
    </Section>
  )
}

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
        icon={<CalendarX size={28} aria-hidden="true" />}
        title="Ingen økter denne uken"
        description={
          canManageWorkouts && activeHomeAthlete?.displayName
            ? `Ingen økter for ${activeHomeAthlete.displayName}.`
            : 'Sjekk en annen uke eller spør treneren din.'
        }
      />
    )
  }

  return (
    <>
      <WeekSummary workouts={workouts} doneCount={doneCount} />

      {homeWorkoutLayout === 'calendar' ? (
        <div className="ah-day-list">
          {workoutDays.map(day => (
            <Section
              key={day.value}
              title={day.label}
              subtitle={
                day.workouts.length > 0
                  ? `${day.workouts.length} økt${day.workouts.length > 1 ? 'er' : ''}`
                  : 'Hvile / ingen økter'
              }
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
