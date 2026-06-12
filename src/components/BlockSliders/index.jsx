import {
  estimatedSpeedKmh,
  formatDistance,
  formatDuration,
  getSpeedUnitForActivity,
  normalizeSection,
  paceToSpeed,
  speedToPace,
} from '../../sessionBlocks'
import SliderRow, { ModeButton, PaceOrSpeedSlider, SetPaceToggle } from './SliderRow'
import IntervalSliders from './IntervalSliders'
import { StrengthSliders, DurationSliders, SprintSliders } from './StrengthSliders'
import {
  DISTANCE_MAX,
  DISTANCE_MIN,
  DISTANCE_STEP,
  DURATION_MAX,
  DURATION_MIN,
  DURATION_STEP,
} from './constants'

// Manual distance estimate (stats only) caps higher than a single interval rep
// since a whole steady block can be long.
const EST_TOTAL_MIN = 0
const EST_TOTAL_MAX = 50
const EST_TOTAL_STEP = 0.1

export default function BlockSliders({ block, onChange, activityTag }) {
  const unit = getSpeedUnitForActivity(activityTag)

  function patch(next) {
    onChange(normalizeSection({ ...block, ...next }, activityTag))
  }

  // Dispatch on the section kind itself — this keeps each session domain
  // (distance / strength / duration) showing only sport-appropriate fields.
  switch (block.kind) {
    case 'interval':
      return <IntervalSliders block={block} unit={unit} activityTag={activityTag} onPatch={patch} />
    case 'exercise':
      return <StrengthSliders block={block} onPatch={patch} />
    case 'effort':
      return <DurationSliders block={block} onPatch={patch} />
    case 'sprint':
      return <SprintSliders block={block} onPatch={patch} />
    default:
      // warmup / steady / cooldown — time-based variant has no distanceKm.
      if ((block.kind === 'warmup' || block.kind === 'cooldown') && block.distanceKm == null) {
        return <DurationSliders block={block} onPatch={patch} />
      }
      return <SteadySliders block={block} unit={unit} activityTag={activityTag} onPatch={patch} />
  }
}

function SteadySliders({ block, unit, activityTag, onPatch }) {
  const speedKmh = paceToSpeed(block.paceSecPerKm)
  const paceMode = block.paceMode === 'time' ? 'time' : 'length'
  const hasPace = Number(block.paceSecPerKm) > 0

  function setMode(nextMode) {
    if (nextMode === paceMode) return
    onPatch({ paceMode: nextMode })
  }

  function toggleSetPace(checked) {
    // Seed a realistic pace from the activity's estimated speed when enabling,
    // clear it entirely when disabling.
    onPatch({ paceSecPerKm: checked ? speedToPace(estimatedSpeedKmh(activityTag)) : 0 })
  }

  return (
    <div className="th-block-sliders">
      <div className="th-block-mode-toggle" role="tablist" aria-label="Define by">
        <ModeButton current={paceMode} value="time" label="Time" onSelect={setMode} />
        <ModeButton current={paceMode} value="length" label="Length" onSelect={setMode} />
      </div>

      {paceMode === 'time' ? (
        <SliderRow
          label="Duration"
          value={Math.min(DURATION_MAX, Math.max(DURATION_MIN, Number(block.durationMin) || DURATION_MIN))}
          min={DURATION_MIN}
          max={DURATION_MAX}
          step={DURATION_STEP}
          display={formatDuration(block.durationMin)}
          onChange={(v) => onPatch({ durationMin: Math.round(v) })}
        />
      ) : (
        <SliderRow
          label="Length"
          value={block.distanceKm}
          min={DISTANCE_MIN}
          max={DISTANCE_MAX}
          step={DISTANCE_STEP}
          display={formatDistance(block.distanceKm)}
          onChange={(v) => onPatch({ distanceKm: Number(v.toFixed(2)) })}
        />
      )}

      <SetPaceToggle checked={hasPace} onToggle={toggleSetPace} />
      {hasPace && (
        <PaceOrSpeedSlider unit={unit} paceSecPerKm={block.paceSecPerKm} speedKmh={speedKmh} onPatch={onPatch} />
      )}
      {/* Time mode without a pace: let the coach set the distance estimate by
          hand (stats only) instead of relying on the auto estimate. */}
      {paceMode === 'time' && !hasPace && (
        <div className="th-block-est-distance">
          <SliderRow
            label="Estimated distance (statistics only)"
            value={Math.min(EST_TOTAL_MAX, Math.max(EST_TOTAL_MIN, Number(block.distanceKm) || 0))}
            min={EST_TOTAL_MIN}
            max={EST_TOTAL_MAX}
            step={EST_TOTAL_STEP}
            display={formatDistance(block.distanceKm)}
            onChange={(v) => onPatch({ estimatedDistanceKm: Number(v.toFixed(2)) })}
          />
          <p className="th-block-est-distance-hint">
            Counted toward weekly distance. Does not affect time or the athlete's pace.
          </p>
        </div>
      )}
      <div className="th-block-totals">
        <span className="th-block-total">
          {/* In length mode without a pace, time is the estimated dimension. */}
          <span className="th-block-total-label">Time{paceMode === 'length' && !hasPace ? ' (est.)' : ''}</span>
          <span className="th-block-total-value">{formatDuration(block.durationMin)}</span>
        </span>
        <span className="th-block-total">
          <span className="th-block-total-label">Distance{paceMode === 'time' ? ' (est.)' : ''}</span>
          <span className="th-block-total-value">{formatDistance(block.distanceKm)}</span>
        </span>
      </div>
    </div>
  )
}
