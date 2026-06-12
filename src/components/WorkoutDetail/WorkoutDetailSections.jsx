import { hasStructuredBlocks } from '../../sessionBlocks'
import SessionBlocksView from './SessionBlocksView'

function Section({ label, children, preLine, className }) {
  return (
    <div className="modal-section">
      <div className="section-label">{label}</div>
      <div
        className={`section-content${className ? ` ${className}` : ''}`}
        {...(preLine ? { 'data-pre-line': true } : {})}
      >
        {children}
      </div>
    </div>
  )
}

export default function WorkoutDetailSections({
  workout,
  isDistanceWorkout,
  isStrengthWorkout,
  sessionInstructions,
  exerciseLines,
}) {
  const showBlocks = hasStructuredBlocks(workout)

  return (
    <>
      {showBlocks && <SessionBlocksView workout={workout} />}

      {/* Distance is only meaningful for distance-based sports (run/swim/bike/row). */}
      {isDistanceWorkout && !showBlocks && workout.distance && (
        <Section label="Distance (km)">{workout.distance}</Section>
      )}

      {/* Strength sessions list exercises (sets/reps/load live in each line). */}
      {isStrengthWorkout && exerciseLines.length > 0 && (
        <div className="modal-section">
          <div className="section-label">Exercises</div>
          <ul className="detail-list">
            {exerciseLines.map((line, index) => (
              <li key={`${line}-${index}`}>{line}</li>
            ))}
          </ul>
        </div>
      )}

      {isStrengthWorkout && workout.rest && (
        <Section label="Rest">{workout.rest}</Section>
      )}

      {/* Free-text instructions: shown for non-strength sessions, or for
          strength sessions only when there is no structured exercise list. */}
      {sessionInstructions && (!isStrengthWorkout || exerciseLines.length === 0) && (
        <Section
          label={isStrengthWorkout ? 'Training session' : 'What to do'}
          preLine
          className="workout-desc"
        >
          {sessionInstructions}
        </Section>
      )}

      {workout.notes && (
        <Section label="Notes" preLine>{workout.notes}</Section>
      )}
    </>
  )
}
