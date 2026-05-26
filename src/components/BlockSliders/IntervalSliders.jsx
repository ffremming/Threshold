import {
  formatDistance,
  formatDuration,
  formatPaceLabel,
  formatPauseLabel,
  formatSpeedLabel,
  paceToSpeed,
  speedToPace,
} from '../../sessionBlocks'
import SliderRow, { EstimatedDistanceRow, ModeButton } from './SliderRow'
import {
  DRAG_MAX,
  DRAG_MIN,
  DRAG_STEP,
  DRAG_TIME_MAX,
  DRAG_TIME_MIN,
  DRAG_TIME_STEP,
  PACE_MAX,
  PACE_MIN,
  PACE_STEP,
  PAUSE_MAX,
  PAUSE_MIN,
  PAUSE_STEP,
  REPS_MAX,
  REPS_MIN,
  REPS_STEP,
  SPEED_MAX,
  SPEED_MIN,
  SPEED_STEP,
  clampPace,
  formatSeconds,
} from './constants'

export default function IntervalSliders({ block, unit, activityTag, onPatch }) {
  const reps = Math.max(1, Number(block.reps) || 1)
  const dragKm = Number(block.dragKm) || 0
  const dragSec = Math.max(0, Math.round(Number(block.dragSec) || 0))
  const pace = Number(block.paceSecPerKm) || 0
  const speedKmh = paceToSpeed(pace)
  const paceMode = block.paceMode || 'pace'

  function setMode(nextMode) {
    if (nextMode === paceMode) return
    onPatch({ paceMode: nextMode })
  }

  function setReps(value) {
    onPatch({ reps: Math.round(value) })
  }

  function setDragKm(value) {
    const next = Math.max(0, Number(value.toFixed(3)))
    if (paceMode === 'pace') {
      onPatch({ dragKm: next, dragSec: Math.round(next * pace) })
    } else {
      onPatch({ dragKm: next })
    }
  }

  function setDragTime(seconds) {
    const safeSec = Math.max(0, Math.round(seconds))
    if (paceMode === 'pace') {
      const safeKm = dragKm > 0 ? dragKm : 0.1
      const newPace = clampPace(Math.round(safeSec / safeKm))
      onPatch({
        ...(dragKm > 0 ? {} : { dragKm: 0.1 }),
        dragSec: safeSec,
        paceSecPerKm: newPace,
      })
    } else {
      onPatch({ dragSec: safeSec })
    }
  }

  function setPaceSec(newPace) {
    onPatch({ paceSecPerKm: clampPace(Math.round(newPace)) })
  }

  function setSpeed(newSpeed) {
    onPatch({ paceSecPerKm: clampPace(speedToPace(newSpeed)) })
  }

  function setEstimatedDragKm(value) {
    onPatch({ estimatedDragKm: Math.max(0, Number(value.toFixed(3))) })
  }

  return (
    <div className="tp-block-sliders">
      <div className="tp-block-mode-toggle" role="tablist" aria-label="Define interval by">
        <ModeButton current={paceMode} value="pace" label="Pace" onSelect={setMode} />
        <ModeButton current={paceMode} value="length" label="Length" onSelect={setMode} />
        <ModeButton current={paceMode} value="time" label="Time" onSelect={setMode} />
      </div>

      <SliderRow
        label="Number of reps"
        value={reps}
        min={REPS_MIN}
        max={REPS_MAX}
        step={REPS_STEP}
        display={`${reps}×`}
        onChange={setReps}
      />

      {(paceMode === 'pace' || paceMode === 'length') && (
        <SliderRow
          label="Rep length"
          value={dragKm}
          min={DRAG_MIN}
          max={DRAG_MAX}
          step={DRAG_STEP}
          display={formatDistance(dragKm)}
          onChange={setDragKm}
        />
      )}

      {(paceMode === 'pace' || paceMode === 'time') && (
        <SliderRow
          label="Rep time"
          value={Math.min(DRAG_TIME_MAX, Math.max(DRAG_TIME_MIN, dragSec || 60))}
          min={DRAG_TIME_MIN}
          max={DRAG_TIME_MAX}
          step={DRAG_TIME_STEP}
          display={formatSeconds(dragSec)}
          onChange={(v) => setDragTime(Math.round(v))}
        />
      )}

      {paceMode === 'pace' && (
        unit === 'pace' ? (
          <SliderRow
            label="Pace"
            value={clampPace(pace)}
            min={PACE_MIN}
            max={PACE_MAX}
            step={PACE_STEP}
            inverted
            display={formatPaceLabel(pace)}
            onChange={setPaceSec}
          />
        ) : (
          <SliderRow
            label="Speed"
            value={speedKmh}
            min={SPEED_MIN}
            max={SPEED_MAX}
            step={SPEED_STEP}
            display={formatSpeedLabel(speedKmh)}
            onChange={setSpeed}
          />
        )
      )}

      {paceMode === 'time' && (
        <EstimatedDistanceRow
          block={block}
          activityTag={activityTag}
          onChange={setEstimatedDragKm}
        />
      )}

      <SliderRow
        label="Rest between reps"
        value={block.pauseSec || 0}
        min={PAUSE_MIN}
        max={PAUSE_MAX}
        step={PAUSE_STEP}
        display={formatPauseLabel(block.pauseSec)}
        onChange={(v) => onPatch({ pauseSec: Math.round(v) })}
      />

      <div className="tp-block-totals">
        <span className="tp-block-total">
          <span className="tp-block-total-label">Total time</span>
          <span className="tp-block-total-value">{formatDuration(block.durationMin)}</span>
        </span>
        <span className="tp-block-total">
          <span className="tp-block-total-label">Total distance{paceMode === 'time' ? ' (est.)' : ''}</span>
          <span className="tp-block-total-value">{formatDistance(block.distanceKm)}</span>
        </span>
      </div>
    </div>
  )
}
