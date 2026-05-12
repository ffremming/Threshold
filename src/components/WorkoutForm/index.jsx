import {
  WORKOUT_TYPES,
  WEEKDAY_OPTIONS,
  getDefaultLoadTag,
  getAllowedIntensityZones,
  getDefaultIntensityZones,
  migrateWorkoutType,
  normalizeIntensityZones,
} from '../../utils'
import SessionEditor from '../SessionEditor'
import ActivityPicker from './ActivityPicker'

export default function WorkoutForm({ value, onChange, showScheduleFields = false }) {
  const type = migrateWorkoutType(value.type)
  const allowedZones = getAllowedIntensityZones(type)

  function set(key, val) {
    onChange({ ...value, [key]: val })
  }

  function setActivityTag(activityTag) {
    const nextActivityTag = value.activityTag === activityTag ? '' : activityTag
    onChange({ ...value, activityTag: nextActivityTag })
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
        Aktivitet
        <ActivityPicker
          selected={value.activityTag}
          onSelect={setActivityTag}
        />
      </label>

      <label>
        Type
        <select value={type} onChange={e => setType(e.target.value)}>
          {WORKOUT_TYPES.map(t => (
            <option key={t.value} value={t.value}>{t.label}</option>
          ))}
        </select>
      </label>

      {showScheduleFields && (
        <div className="date-time-row">
          <label>
            Fast dag
            <select
              value={value.weekday || ''}
              onChange={e => set('weekday', Number(e.target.value))}
              required
            >
              <option value="">Velg dag</option>
              {WEEKDAY_OPTIONS.map(day => (
                <option key={day.value} value={day.value}>{day.label}</option>
              ))}
            </select>
          </label>
          <label>
            Klokkeslett
            <input
              type="time"
              value={value.time || ''}
              onChange={e => set('time', e.target.value)}
            />
          </label>
        </div>
      )}

      {showScheduleFields && (
        <div className="field-hint">Du kan legge flere økter på samme dag. Tid brukes for rekkefølge hvis den er satt.</div>
      )}

      <label>
        Tittel *
        <input
          type="text"
          placeholder="F.eks. Rolig jogg"
          value={value.title || ''}
          onChange={e => set('title', e.target.value)}
          required
        />
      </label>

      <label>
        Intensitetssone
        <div className="field-hint">Velg en eller flere soner</div>
        <div className="zone-picker">
          {allowedZones.map(z => (
            <button
              key={z}
              type="button"
              className={`tp-zone-btn tp-zone-${z}${normalizeIntensityZones(type, value.intensityZone).includes(z) ? ' is-active' : ''}`}
              onClick={() => toggleIntensityZone(z)}
            >
              Sone {z}
            </button>
          ))}
        </div>
      </label>

      <label>
        Beskrivelse
        <textarea
          placeholder="F.eks. 4 x 1km @ 11.5 km/t, 5:15 pace, 2 min pause"
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
        Notater
        <textarea
          placeholder="Tips, fokuspunkter, utstyr..."
          value={value.notes || ''}
          onChange={e => set('notes', e.target.value)}
          rows={2}
        />
      </label>
    </div>
  )
}
