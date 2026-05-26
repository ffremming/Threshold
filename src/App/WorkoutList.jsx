import { CalendarX } from 'lucide-react'
import { Section, EmptyState, Stat, WorkoutCard } from '../components/ui'

const TYPE_LABELS = {
  rolig: 'easy',
  molle: 'treadmill',
  terskel: 'threshold',
  interval: 'interval',
  continuous: 'continuous',
  styrke: 'strength',
  annet: 'other',
}

function formatDuration(totalMinutes) {
  if (!totalMinutes) return '0 min'
  const hours = Math.floor(totalMinutes / 60)
  const mins = totalMinutes % 60
  if (hours === 0) return `${mins} min`
  if (mins === 0) return `${hours} h`
  return `${hours} h ${mins} min`
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
      <div className="ah-summary-stats">
        <Stat label="Planned" value={formatDuration(totalMinutes)} />
        <Stat label="Sessions" value={workouts.length} />
        <Stat label="Completed" value={`${doneCount}/${workouts.length}`} />
      </div>

      <div className="ah-summary-progress">
        <div className="ah-summary-progress-meta">
          <span><span className="tp-num">{progressPct}%</span> completed</span>
          {typeBreakdown && <span className="ah-summary-breakdown">{typeBreakdown}</span>}
        </div>
        <div
          className="ah-progress"
          role="progressbar"
          aria-valuenow={progressPct}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={`${doneCount} of ${workouts.length} sessions completed`}
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
  if (loading) return <EmptyState title="Loading sessions…" />

  if (workouts.length === 0) {
    return (
      <EmptyState
        icon={<CalendarX size={28} aria-hidden="true" />}
        title="No sessions this week"
        description={
          canManageWorkouts && activeHomeAthlete?.displayName
            ? `No sessions for ${activeHomeAthlete.displayName}.`
            : 'Check another week or ask your coach.'
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
                  ? `${day.workouts.length} session${day.workouts.length > 1 ? 's' : ''}`
                  : 'Rest'
              }
            >
              {day.workouts.length === 0 ? (
                <div></div>
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
