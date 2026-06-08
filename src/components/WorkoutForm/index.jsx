import {
  WORKOUT_TYPES,
  WEEKDAY_OPTIONS,
  getDefaultLoadTag,
  getAllowedIntensityZones,
  getDefaultIntensityZones,
  migrateWorkoutType,
  normalizeIntensityZones,
} from '../../utils'
import { getSessionDomain } from '../../sessionBlocks'
import SessionEditor from '../SessionEditor'
import ActivityPicker from './ActivityPicker'

export default function WorkoutForm({ value, onChange, showScheduleFields = false }) {
  const type = migrateWorkoutType(value.type)
  const allowedZones = getAllowedIntensityZones(type)
  const domain = getSessionDomain(value.activityTag)
  // Strength sessions are sets/reps/load based — interval-vs-continuous and
  // intensity zones don't apply, so those fields are hidden for them.
  const isStrength = domain === 'strength'
  const descriptionPlaceholder = domain === 'strength'
    ? 'E.g. Squat 3 x 8, deadlift 3 x 5, 90 sec rest'
    : domain === 'duration'
      ? 'E.g. 45 min flow, focus on breathing and mobility'
      : 'E.g. 4 x 1km @ 11.5 km/h, 5:15 pace, 2 min rest'

  function set(key, val) {
    onChange({ ...value, [key]: val })
  }

  function setActivityTag(activityTag) {
    const nextActivityTag = value.activityTag === activityTag ? '' : activityTag
    const next = { ...value, activityTag: nextActivityTag }
    // When the activity's measurement domain changes (e.g. running ->
    // strength), the existing distance/pace-based blocks become
    // nonsensical. Reset them so the SessionEditor re-derives sport-
    // appropriate defaults for the new domain.
    if (getSessionDomain(value.activityTag) !== getSessionDomain(nextActivityTag)) {
      next.blocks = null
    }
    onChange(next)
  }

  function setType(nextType) {
    const intensityZone = normalizeIntensityZones(nextType, value.intensityZone ?? getDefaultIntensityZones(nextType))
    onChange({
      ...value,
      type: nextType,
      intensityZone,
      loadTag: getDefaultLoadTag(nextType, intensityZone),
    })
  }

  function toggleIntensityZone(zone) {
    const currentZones = normalizeIntensityZones(type, value.intensityZone)
    const nextZones = currentZones.includes(zone)
      ? (currentZones.length > 1 ? currentZones.filter(currentZone => currentZone !== zone) : currentZones)
      : [...currentZones, zone].sort((a, b) => a - b)

    set('intensityZone', nextZones)
  }

  return (
    <div className="add-form">
      <label>
        Activity
        <ActivityPicker
          selected={value.activityTag}
          onSelect={setActivityTag}
        />
      </label>

      {!isStrength && (
        <label>
          Type
          <select value={type} onChange={e => setType(e.target.value)}>
            {WORKOUT_TYPES.map(t => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>
        </label>
      )}

      {showScheduleFields && (
        <div className="date-time-row">
          <label>
            Fixed day
            <select
              value={value.weekday || ''}
              onChange={e => set('weekday', Number(e.target.value))}
              required
            >
              <option value="">Select day</option>
              {WEEKDAY_OPTIONS.map(day => (
                <option key={day.value} value={day.value}>{day.label}</option>
              ))}
            </select>
          </label>
          <label>
            Time
            <input
              type="time"
              value={value.time || ''}
              onChange={e => set('time', e.target.value)}
            />
          </label>
        </div>
      )}

      {showScheduleFields && (
        <div className="field-hint">You can add multiple sessions on the same day. Time is used for ordering when set.</div>
      )}

      <label>
        Title *
        <input
          type="text"
          placeholder="E.g. Easy jog"
          value={value.title || ''}
          onChange={e => set('title', e.target.value)}
          required
        />
      </label>

      {!isStrength && (
        <label>
          Intensity zone
          <div className="field-hint">Select one or more zones</div>
          <div className="zone-picker">
            {allowedZones.map(z => (
              <button
                key={z}
                type="button"
                className={`th-zone-btn th-zone-${z}${normalizeIntensityZones(type, value.intensityZone).includes(z) ? ' is-active' : ''}`}
                onClick={() => toggleIntensityZone(z)}
              >
                Zone {z}
              </button>
            ))}
          </div>
        </label>
      )}

      <label>
        Description
        <textarea
          placeholder={descriptionPlaceholder}
          value={value.description || ''}
          onChange={e => set('description', e.target.value)}
          rows={3}
        />
      </label>

      <SessionEditor
        value={value.blocks}
        activityTag={value.activityTag}
        workoutType={type}
        onChange={(blocks) => set('blocks', blocks)}
      />

      <label>
        Notes
        <textarea
          placeholder="Tips, focus points, equipment..."
          value={value.notes || ''}
          onChange={e => set('notes', e.target.value)}
          rows={2}
        />
      </label>
    </div>
  )
}
