import {
  formatDistance,
  formatDuration,
  formatPaceLabel,
  formatPauseLabel,
  formatSpeedLabel,
  getSpeedUnitForActivity,
  normalizeSection,
  paceToSpeed,
  speedToPace,
} from '../sessionBlocks'

const DISTANCE_MIN = 0
const DISTANCE_MAX = 50
const DISTANCE_STEP = 0.1

const DRAG_MIN = 0.05
const DRAG_MAX = 10
const DRAG_STEP = 0.05

const DRAG_TIME_MIN = 10
const DRAG_TIME_MAX = 60 * 30
const DRAG_TIME_STEP = 5

const REPS_MIN = 1
const REPS_MAX = 30
const REPS_STEP = 1

const PACE_MIN = 180
const PACE_MAX = 540
const PACE_STEP = 5

const SPEED_MIN = 5
const SPEED_MAX = 50
const SPEED_STEP = 0.5

const PAUSE_MIN = 0
const PAUSE_MAX = 600
const PAUSE_STEP = 5

const EST_DISTANCE_MIN = 0
const EST_DISTANCE_MAX = 10
const EST_DISTANCE_STEP = 0.05

export default function BlockSliders({ block, onChange, activityTag, mode = 'steady' }) {
  const unit = getSpeedUnitForActivity(activityTag)

  function patch(next) {
    onChange(normalizeSection({ ...block, ...next }, activityTag))
  }

  if (mode === 'interval') {
    return <IntervalSliders block={block} unit={unit} activityTag={activityTag} onPatch={patch} />
  }

  return <SteadySliders block={block} unit={unit} onPatch={patch} />
}

function SteadySliders({ block, unit, onPatch }) {
  const speedKmh = paceToSpeed(block.paceSecPerKm)
  return (
    <div className="tp-block-sliders">
      <SliderRow
        label="Lengde"
        value={block.distanceKm}
        min={DISTANCE_MIN}
        max={DISTANCE_MAX}
        step={DISTANCE_STEP}
        display={formatDistance(block.distanceKm)}
        onChange={(v) => onPatch({ distanceKm: Number(v.toFixed(2)) })}
      />
      <PaceOrSpeedSlider unit={unit} paceSecPerKm={block.paceSecPerKm} speedKmh={speedKmh} onPatch={onPatch} />
      <div className="tp-block-totals">
        <span className="tp-block-total">
          <span className="tp-block-total-label">Tid</span>
          <span className="tp-block-total-value">{formatDuration(block.durationMin)}</span>
        </span>
        <span className="tp-block-total">
          <span className="tp-block-total-label">Distanse</span>
          <span className="tp-block-total-value">{formatDistance(block.distanceKm)}</span>
        </span>
      </div>
    </div>
  )
}

function IntervalSliders({ block, unit, activityTag, onPatch }) {
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
      <div className="tp-block-mode-toggle" role="tablist" aria-label="Definer intervall etter">
        <ModeButton current={paceMode} value="pace" label="Pace" onSelect={setMode} />
        <ModeButton current={paceMode} value="length" label="Lengde" onSelect={setMode} />
        <ModeButton current={paceMode} value="time" label="Tid" onSelect={setMode} />
      </div>

      <SliderRow
        label="Antall drag"
        value={reps}
        min={REPS_MIN}
        max={REPS_MAX}
        step={REPS_STEP}
        display={`${reps}×`}
        onChange={setReps}
      />

      {(paceMode === 'pace' || paceMode === 'length') && (
        <SliderRow
          label="Drag lengde"
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
          label="Drag tid"
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
            label="Tempo"
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
            label="Fart"
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
        label="Pause mellom drag"
        value={block.pauseSec || 0}
        min={PAUSE_MIN}
        max={PAUSE_MAX}
        step={PAUSE_STEP}
        display={formatPauseLabel(block.pauseSec)}
        onChange={(v) => onPatch({ pauseSec: Math.round(v) })}
      />

      <div className="tp-block-totals">
        <span className="tp-block-total">
          <span className="tp-block-total-label">Total tid</span>
          <span className="tp-block-total-value">{formatDuration(block.durationMin)}</span>
        </span>
        <span className="tp-block-total">
          <span className="tp-block-total-label">Total distanse{paceMode === 'time' ? ' (est.)' : ''}</span>
          <span className="tp-block-total-value">{formatDistance(block.distanceKm)}</span>
        </span>
      </div>
    </div>
  )
}

function EstimatedDistanceRow({ block, activityTag, onChange }) {
  const reps = Math.max(1, Number(block.reps) || 1)
  const currentTotal = Number(block.distanceKm) || 0
  const perRep = currentTotal / reps
  return (
    <div className="tp-block-est-distance">
      <SliderRow
        label="Estimert distanse per drag (kun statistikk)"
        value={Math.min(EST_DISTANCE_MAX, Math.max(EST_DISTANCE_MIN, perRep))}
        min={EST_DISTANCE_MIN}
        max={EST_DISTANCE_MAX}
        step={EST_DISTANCE_STEP}
        display={`${formatDistance(perRep)} (${formatDistance(currentTotal)} total)`}
        onChange={onChange}
      />
      <p className="tp-block-est-distance-hint">
        Telles inn i ukentlig distanse for {activityTag || 'aktivitet'}. Påvirker ikke tid.
      </p>
    </div>
  )
}

function ModeButton({ current, value, label, onSelect }) {
  const active = current === value
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      className={`tp-block-mode-btn${active ? ' is-active' : ''}`}
      onClick={() => onSelect(value)}
    >
      {label}
    </button>
  )
}

function PaceOrSpeedSlider({ unit, paceSecPerKm, speedKmh, onPatch }) {
  if (unit === 'pace') {
    return (
      <SliderRow
        label="Tempo"
        value={clampPace(paceSecPerKm)}
        min={PACE_MIN}
        max={PACE_MAX}
        step={PACE_STEP}
        inverted
        display={formatPaceLabel(paceSecPerKm)}
        onChange={(v) => onPatch({ paceSecPerKm: clampPace(Math.round(v)) })}
      />
    )
  }
  return (
    <SliderRow
      label="Fart"
      value={speedKmh}
      min={SPEED_MIN}
      max={SPEED_MAX}
      step={SPEED_STEP}
      display={formatSpeedLabel(speedKmh)}
      onChange={(v) => onPatch({ paceSecPerKm: clampPace(speedToPace(v)) })}
    />
  )
}

function clampPace(pace) {
  if (!Number.isFinite(pace) || pace <= 0) return PACE_MIN
  return Math.min(PACE_MAX, Math.max(PACE_MIN, pace))
}

function formatSeconds(totalSec) {
  const sec = Math.max(0, Math.round(Number(totalSec) || 0))
  if (sec >= 60) {
    const m = Math.floor(sec / 60)
    const s = sec % 60
    return s > 0 ? `${m}m ${String(s).padStart(2, '0')}s` : `${m} min`
  }
  return `${sec}s`
}

function SliderRow({ label, value, min, max, step, display, onChange, inverted }) {
  const sliderValue = inverted ? (max + min - value) : value
  function handleChange(e) {
    const raw = Number(e.target.value)
    onChange(inverted ? (max + min - raw) : raw)
  }
  return (
    <div className="tp-slider-row">
      <div className="tp-slider-row-head">
        <span className="tp-slider-row-label">{label}</span>
        <span className="tp-slider-row-display">{display}</span>
      </div>
      <input
        type="range"
        className="tp-slider"
        min={min}
        max={max}
        step={step}
        value={sliderValue}
        onChange={handleChange}
      />
    </div>
  )
}
