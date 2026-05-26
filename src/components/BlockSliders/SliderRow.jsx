import { formatDistance, formatPaceLabel, formatSpeedLabel, speedToPace } from '../../sessionBlocks'
import {
  EST_DISTANCE_MAX,
  EST_DISTANCE_MIN,
  EST_DISTANCE_STEP,
  PACE_MAX,
  PACE_MIN,
  PACE_STEP,
  SPEED_MAX,
  SPEED_MIN,
  SPEED_STEP,
  clampPace,
} from './constants'

export default function SliderRow({ label, value, min, max, step, display, onChange, inverted }) {
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

export function ModeButton({ current, value, label, onSelect }) {
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

export function PaceOrSpeedSlider({ unit, paceSecPerKm, speedKmh, onPatch }) {
  if (unit === 'pace') {
    return (
      <SliderRow
        label="Pace"
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
      label="Speed"
      value={speedKmh}
      min={SPEED_MIN}
      max={SPEED_MAX}
      step={SPEED_STEP}
      display={formatSpeedLabel(speedKmh)}
      onChange={(v) => onPatch({ paceSecPerKm: clampPace(speedToPace(v)) })}
    />
  )
}

export function EstimatedDistanceRow({ block, activityTag, onChange }) {
  const reps = Math.max(1, Number(block.reps) || 1)
  const currentTotal = Number(block.distanceKm) || 0
  const perRep = currentTotal / reps
  return (
    <div className="tp-block-est-distance">
      <SliderRow
        label="Estimated distance per rep (statistics only)"
        value={Math.min(EST_DISTANCE_MAX, Math.max(EST_DISTANCE_MIN, perRep))}
        min={EST_DISTANCE_MIN}
        max={EST_DISTANCE_MAX}
        step={EST_DISTANCE_STEP}
        display={`${formatDistance(perRep)} (${formatDistance(currentTotal)} total)`}
        onChange={onChange}
      />
      <p className="tp-block-est-distance-hint">
        Counted toward weekly distance for {activityTag || 'activity'}. Does not affect time.
      </p>
    </div>
  )
}
