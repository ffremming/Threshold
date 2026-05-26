import {
  SECTION_LABELS,
  computeSessionTotals,
  formatDistance,
  formatDuration,
  formatLoad,
  formatPaceLabel,
  formatPauseLabel,
  formatSetsReps,
  formatSpeedLabel,
  getSections,
  getSpeedUnitForActivity,
  paceToSpeed,
} from '../../sessionBlocks'

function formatSeconds(totalSec) {
  const sec = Math.max(0, Math.round(Number(totalSec) || 0))
  if (sec >= 60) {
    const m = Math.floor(sec / 60)
    const s = sec % 60
    return s > 0 ? `${m}m ${String(s).padStart(2, '0')}s` : `${m} min`
  }
  return `${sec}s`
}

function describeSpeed(paceSecPerKm, activityTag) {
  if (!paceSecPerKm || paceSecPerKm <= 0) return null
  const unit = getSpeedUnitForActivity(activityTag)
  return unit === 'pace'
    ? formatPaceLabel(paceSecPerKm)
    : formatSpeedLabel(paceToSpeed(paceSecPerKm))
}

function SectionRow({ section, activityTag }) {
  const label = SECTION_LABELS[section.kind] || 'Del'
  const speedLabel = describeSpeed(section.paceSecPerKm, activityTag)

  if (section.kind === 'exercise') {
    return (
      <li className="session-block-row">
        <div className="session-block-row-head">
          <span className="session-block-row-label">{label}</span>
          <span className="session-block-row-main">
            {section.exerciseName?.trim() || 'Exercise'}
          </span>
        </div>
        <div className="session-block-row-meta">
          <span>{formatSetsReps(section.sets, section.reps)}</span>
          <span>{formatLoad(section.loadKg)}</span>
          {section.restSec > 0 && <span>{formatSeconds(section.restSec)} pause</span>}
        </div>
      </li>
    )
  }

  if (section.kind === 'effort') {
    return (
      <li className="session-block-row">
        <div className="session-block-row-head">
          <span className="session-block-row-label">{label}</span>
          <span className="session-block-row-main">
            {formatDuration(section.durationMin)}
          </span>
        </div>
      </li>
    )
  }

  // Time-based warmup/cooldown (strength/duration sessions): duration, no distance.
  if ((section.kind === 'warmup' || section.kind === 'cooldown') &&
      section.durationMin != null &&
      !(Number(section.distanceKm) > 0) &&
      section.paceSecPerKm == null) {
    return (
      <li className="session-block-row">
        <div className="session-block-row-head">
          <span className="session-block-row-label">{label}</span>
          <span className="session-block-row-main">
            {formatDuration(section.durationMin)}
          </span>
        </div>
      </li>
    )
  }

  if (section.kind === 'interval') {
    const mode = section.paceMode || 'pace'
    const reps = Math.max(1, Number(section.reps) || 1)
    let dragLabel
    if (mode === 'time') {
      dragLabel = formatSeconds(section.dragSec)
    } else {
      dragLabel = formatDistance(section.dragKm)
    }
    const showSpeed = mode === 'pace' && speedLabel
    return (
      <li className="session-block-row">
        <div className="session-block-row-head">
          <span className="session-block-row-label">{label}</span>
          <span className="session-block-row-main">
            {reps} × {dragLabel}
            {showSpeed && <> @ {speedLabel}</>}
          </span>
        </div>
        <div className="session-block-row-meta">
          {section.pauseSec > 0 && <span>{formatPauseLabel(section.pauseSec)}</span>}
          {section.durationMin > 0 && <span>{formatDuration(section.durationMin)} totalt</span>}
        </div>
      </li>
    )
  }

  return (
    <li className="session-block-row">
      <div className="session-block-row-head">
        <span className="session-block-row-label">{label}</span>
        <span className="session-block-row-main">
          {formatDistance(section.distanceKm)}
          {speedLabel && <> @ {speedLabel}</>}
        </span>
      </div>
      {section.durationMin > 0 && (
        <div className="session-block-row-meta">
          <span>{formatDuration(section.durationMin)}</span>
        </div>
      )}
    </li>
  )
}

export default function SessionBlocksView({ workout }) {
  const activityTag = workout.activityTag
  const sections = getSections(workout.blocks, activityTag)
  if (sections.length === 0) return null
  const totals = computeSessionTotals(workout.blocks, activityTag)
  return (
    <div className="modal-section">
      <div className="section-label">Plan</div>
      <ul className="session-blocks-list">
        {sections.map(section => (
          <SectionRow key={section.id} section={section} activityTag={activityTag} />
        ))}
      </ul>
      {(totals.totalDuration > 0 || totals.totalDistance > 0) && (
        <div className="session-blocks-totals">
          {totals.totalDistance > 0 && <span>Totalt: {formatDistance(totals.totalDistance)}</span>}
          {totals.totalDuration > 0 && <span>{formatDuration(totals.totalDuration)}</span>}
        </div>
      )}
    </div>
  )
}
