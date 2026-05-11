export default function WorkoutDetailSections({
  workout,
  isRunningWorkout,
  isStrengthWorkout,
  runningDetails,
  exerciseLines,
}) {
  return (
    <>
      {isRunningWorkout && (
        <>
          {workout.distance && (
            <div className="modal-section">
              <div className="section-label">Antall km</div>
              <div className="section-content">{workout.distance}</div>
            </div>
          )}

          {runningDetails && (
            <div className="modal-section">
              <div className="section-label">Hva skal gjøres</div>
              <div className="section-content workout-desc" data-pre-line>
                {runningDetails}
              </div>
            </div>
          )}
        </>
      )}

      {!isRunningWorkout && workout.description && (!isStrengthWorkout || workout.exercises) && (
        <div className="modal-section">
          <div className="section-label">Treningsøkt</div>
          <div className="section-content workout-desc" data-pre-line>{workout.description}</div>
        </div>
      )}

      {workout.warmup && (
        <div className="modal-section">
          <div className="section-label">Oppvarming</div>
          <div className="section-content">{workout.warmup}</div>
        </div>
      )}

      {workout.cooldown && (
        <div className="modal-section">
          <div className="section-label">Nedkjøling</div>
          <div className="section-content">{workout.cooldown}</div>
        </div>
      )}

      {isStrengthWorkout && exerciseLines.length > 0 && (
        <div className="modal-section">
          <div className="section-label">Øvelser</div>
          <ul className="detail-list">
            {exerciseLines.map((line, index) => (
              <li key={`${line}-${index}`}>{line}</li>
            ))}
          </ul>
        </div>
      )}

      {isStrengthWorkout && workout.rest && (
        <div className="modal-section">
          <div className="section-label">Pause</div>
          <div className="section-content">{workout.rest}</div>
        </div>
      )}

      {workout.notes && (
        <div className="modal-section">
          <div className="section-label">Notater</div>
          <div className="section-content" data-pre-line>{workout.notes}</div>
        </div>
      )}
    </>
  )
}
