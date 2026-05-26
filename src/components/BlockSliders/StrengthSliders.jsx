import { formatDuration, formatLoad, formatPauseLabel } from '../../sessionBlocks'
import SliderRow from './SliderRow'
import {
  DURATION_MAX,
  DURATION_MIN,
  DURATION_STEP,
  LOAD_MAX,
  LOAD_MIN,
  LOAD_STEP,
  REST_MAX,
  REST_MIN,
  REST_STEP,
  SETS_MAX,
  SETS_MIN,
  SETS_STEP,
  STRENGTH_REPS_MAX,
  STRENGTH_REPS_MIN,
  STRENGTH_REPS_STEP,
} from './constants'

// Editor for a strength "exercise" section: name + sets/reps/load/rest.
// Distance and pace are intentionally absent — they make no sense here.
export function StrengthSliders({ block, onPatch }) {
  return (
    <div className="tp-block-sliders">
      <label className="tp-block-text-field">
        <span className="tp-block-text-label">Exercise</span>
        <input
          type="text"
          className="tp-block-text-input"
          placeholder="E.g. Squat"
          value={block.exerciseName || ''}
          onChange={(e) => onPatch({ exerciseName: e.target.value })}
        />
      </label>

      <SliderRow
        label="Sets"
        value={Math.max(SETS_MIN, Number(block.sets) || 1)}
        min={SETS_MIN}
        max={SETS_MAX}
        step={SETS_STEP}
        display={`${Math.max(SETS_MIN, Number(block.sets) || 1)} sets`}
        onChange={(v) => onPatch({ sets: Math.round(v) })}
      />

      <SliderRow
        label="Repetitions"
        value={Math.max(STRENGTH_REPS_MIN, Number(block.reps) || 1)}
        min={STRENGTH_REPS_MIN}
        max={STRENGTH_REPS_MAX}
        step={STRENGTH_REPS_STEP}
        display={`${Math.max(0, Number(block.reps) || 0)} reps`}
        onChange={(v) => onPatch({ reps: Math.round(v) })}
      />

      <SliderRow
        label="Load"
        value={Math.min(LOAD_MAX, Math.max(LOAD_MIN, Number(block.loadKg) || 0))}
        min={LOAD_MIN}
        max={LOAD_MAX}
        step={LOAD_STEP}
        display={formatLoad(Number(block.loadKg) || 0)}
        onChange={(v) => onPatch({ loadKg: Number(v.toFixed(1)) })}
      />

      <SliderRow
        label="Rest between sets"
        value={Math.min(REST_MAX, Math.max(REST_MIN, Number(block.restSec) || 0))}
        min={REST_MIN}
        max={REST_MAX}
        step={REST_STEP}
        display={formatPauseLabel(Number(block.restSec) || 0)}
        onChange={(v) => onPatch({ restSec: Math.round(v) })}
      />

      <div className="tp-block-totals">
        <span className="tp-block-total">
          <span className="tp-block-total-label">Estimated time</span>
          <span className="tp-block-total-value">{formatDuration(block.durationMin)}</span>
        </span>
      </div>
    </div>
  )
}

// Editor for a duration-only section (yoga / ball sports / time-based
// warmup & cooldown). Just a single duration slider.
export function DurationSliders({ block, onPatch }) {
  return (
    <div className="tp-block-sliders">
      <SliderRow
        label="Duration"
        value={Math.min(DURATION_MAX, Math.max(DURATION_MIN, Number(block.durationMin) || DURATION_MIN))}
        min={DURATION_MIN}
        max={DURATION_MAX}
        step={DURATION_STEP}
        display={formatDuration(block.durationMin)}
        onChange={(v) => onPatch({ durationMin: Math.round(v) })}
      />
    </div>
  )
}
