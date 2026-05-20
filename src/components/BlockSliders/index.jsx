import {
  formatDistance,
  formatDuration,
  getSpeedUnitForActivity,
  normalizeSection,
  paceToSpeed,
} from '../../sessionBlocks'
import SliderRow, { PaceOrSpeedSlider } from './SliderRow'
import IntervalSliders from './IntervalSliders'
import { StrengthSliders, DurationSliders } from './StrengthSliders'
import { DISTANCE_MAX, DISTANCE_MIN, DISTANCE_STEP } from './constants'

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
