import { useMemo, useState } from 'react'
import {
  WORKOUT_TYPES,
  ACTIVITY_TAGS,
  ACTIVITY_TAG_MAP,
  WEEKDAY_OPTIONS,
  getDefaultLoadTag,
  getAllowedIntensityZones,
  getDefaultIntensityZones,
  migrateWorkoutType,
  normalizeIntensityZones,
} from '../utils'
import ActivityIcon from './ActivityIcon'
import SessionEditor from './SessionEditor'

const PINNED_ACTIVITY_TAGS = ['run', 'strength']

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
              className={`zone-btn zone-btn-${z}${normalizeIntensityZones(type, value.intensityZone).includes(z) ? ' active' : ''}`}
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

function ActivityPicker({ selected, onSelect }) {
  const [query, setQuery] = useState('')

  const pinned = useMemo(() => (
    PINNED_ACTIVITY_TAGS.map(value => ACTIVITY_TAG_MAP[value]).filter(Boolean)
  ), [])

  const searchResults = useMemo(() => {
    const trimmed = query.trim().toLowerCase()
    if (!trimmed) return []
    return ACTIVITY_TAGS
      .filter(tag => !PINNED_ACTIVITY_TAGS.includes(tag.value))
      .filter(tag => (
        tag.label.toLowerCase().includes(trimmed) ||
        tag.value.toLowerCase().includes(trimmed)
      ))
      .slice(0, 8)
  }, [query])

  const selectedOutsidePinned = selected && !PINNED_ACTIVITY_TAGS.includes(selected)
    ? ACTIVITY_TAG_MAP[selected]
    : null

  return (
    <div className="activity-picker">
      <div className="activity-picker-chips">
        {pinned.map(tag => (
          <ActivityChip key={tag.value} tag={tag} active={selected === tag.value} onClick={() => onSelect(tag.value)} />
        ))}
        {selectedOutsidePinned && (
          <ActivityChip tag={selectedOutsidePinned} active onClick={() => onSelect(selectedOutsidePinned.value)} />
        )}
      </div>
      <input
        type="search"
        className="activity-picker-search"
        placeholder="Søk etter annen aktivitet…"
        value={query}
        onChange={e => setQuery(e.target.value)}
      />
      {searchResults.length > 0 && (
        <div className="activity-picker-results">
          {searchResults.map(tag => (
            <button
              key={tag.value}
              type="button"
              className="activity-picker-result"
              onClick={() => { onSelect(tag.value); setQuery('') }}
            >
              <span className="activity-tag-icon"><ActivityIcon name={tag.icon} className="tag-icon-svg" /></span>
              <span>{tag.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

function ActivityChip({ tag, active, onClick }) {
  return (
    <button
      type="button"
      className={`activity-tag-btn${active ? ' active' : ''}`}
      style={{ '--tag-color': tag.color, '--tag-bg': tag.bg }}
      onClick={onClick}
    >
      <span className="activity-tag-icon"><ActivityIcon name={tag.icon} className="tag-icon-svg" /></span>
      <span>{tag.label}</span>
    </button>
  )
}
