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
    <div className="th-slider-row">
      <div className="th-slider-row-head">
        <span className="th-slider-row-label">{label}</span>
        <span className="th-slider-row-display">{display}</span>
      </div>
      <input
        type="range"
        className="th-slider"
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
      className={`th-block-mode-btn${active ? ' is-active' : ''}`}
      onClick={() => onSelect(value)}
    >
      {label}
    </button>
  )
}

// Optional "Set pace" control. When unchecked, the block carries no pace and
// the athlete never sees one; checking it reveals the pace/speed slider.
// Rendered as a compact pill switch so the global modal-input sizing (which
// blows native checkboxes up to a full-width 3rem box) never touches it.
export function SetPaceToggle({ checked, onToggle, label = 'Set pace' }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      className={`th-toggle${checked ? ' is-on' : ''}`}
      onClick={() => onToggle(!checked)}
    >
      <span className="th-toggle-track"><span className="th-toggle-thumb" /></span>
      <span className="th-toggle-label">{label}</span>
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
    <div className="th-block-est-distance">
      <SliderRow
        label="Estimated distance per rep (statistics only)"
        value={Math.min(EST_DISTANCE_MAX, Math.max(EST_DISTANCE_MIN, perRep))}
        min={EST_DISTANCE_MIN}
        max={EST_DISTANCE_MAX}
        step={EST_DISTANCE_STEP}
        display={`${formatDistance(perRep)} (${formatDistance(currentTotal)} total)`}
        onChange={onChange}
      />
      <p className="th-block-est-distance-hint">
        Counted toward weekly distance for {activityTag || 'activity'}. Does not affect time.
      </p>
    </div>
  )
}
