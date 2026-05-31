import {
  formatDistance,
  formatDuration,
  getSpeedUnitForActivity,
  normalizeSection,
  paceToSpeed,
} from '../../sessionBlocks'
import SliderRow, { ModeButton, PaceOrSpeedSlider } from './SliderRow'
import IntervalSliders from './IntervalSliders'
import { StrengthSliders, DurationSliders } from './StrengthSliders'
import {
  DISTANCE_MAX,
  DISTANCE_MIN,
  DISTANCE_STEP,
  DURATION_MAX,
  DURATION_MIN,
  DURATION_STEP,
} from './constants'

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
    default:
      // warmup / steady / cooldown — time-based variant has no distanceKm.
      if ((block.kind === 'warmup' || block.kind === 'cooldown') && block.distanceKm == null) {
        return <DurationSliders block={block} onPatch={patch} />
      }
      return <SteadySliders block={block} unit={unit} onPatch={patch} />
  }
}

function SteadySliders({ block, unit, onPatch }) {
  const speedKmh = paceToSpeed(block.paceSecPerKm)
  const paceMode = block.paceMode === 'time' ? 'time' : 'length'

  function setMode(nextMode) {
    if (nextMode === paceMode) return
    onPatch({ paceMode: nextMode })
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

      <PaceOrSpeedSlider unit={unit} paceSecPerKm={block.paceSecPerKm} speedKmh={speedKmh} onPatch={onPatch} />
      <div className="th-block-totals">
        <span className="th-block-total">
          <span className="th-block-total-label">Time</span>
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
