import { useEffect, useState } from 'react'
import {
  ACTIVITY_TAG_MAP,
  LOAD_TAG_MAP,
  ZONE_COLORS,
  TYPE_COLORS,
  TYPE_ICONS,
  WORKOUT_TYPES,
  formatIntensityZoneLabel,
  formatWorkoutSchedule,
  normalizeIntensityZone,
  normalizeIntensityZones,
} from '../../utils'
import WorkoutForm from '../WorkoutForm'
import IntensityScaleModal from '../IntensityScaleModal'
import SystemIcon from '../SystemIcon'
import WorkoutDetailHeader from './WorkoutDetailHeader'
import WorkoutDetailSections from './WorkoutDetailSections'
import ZoneSummary from './ZoneSummary'
import '../WorkoutDetail.css'

export default function WorkoutDetail({ workout, onClose, canEdit, onDelete, onToggleComplete, onEdit, onSaveComment, onReplace }) {
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState(workout ? { ...workout } : {})
  const [showScale, setShowScale] = useState(false)
  const [commentDraft, setCommentDraft] = useState(workout?.userComment || '')
  const [commentSaving, setCommentSaving] = useState(false)

  useEffect(() => {
    if (!workout) return
    setForm({ ...workout })
    setCommentDraft(workout.userComment || '')
  }, [workout])

  if (!workout) return null

  const zones = normalizeIntensityZones(workout.type, workout.intensityZone)
  const zone = normalizeIntensityZone(workout.type, workout.intensityZone)
  const colors = zone ? ZONE_COLORS[zone] : null
  const typeColors = TYPE_COLORS[workout.type] || TYPE_COLORS.annet
  const icon = TYPE_ICONS[workout.type] || 'AN'
  const typeLabel = WORKOUT_TYPES.find(t => t.value === workout.type)?.label || workout.type
  const zoneLabel = formatIntensityZoneLabel(zones)
  const activityTag = workout.activityTag ? ACTIVITY_TAG_MAP[workout.activityTag] : null
  const loadTag = workout.loadTag ? LOAD_TAG_MAP[workout.loadTag] : null
  const scheduleLabel = formatWorkoutSchedule(workout)
  const isStrengthWorkout = workout.type === 'styrke' || workout.type === 'molle'
  const isRunningWorkout = ['interval', 'terskel', 'rolig', 'molle'].includes(workout.type)
  const exerciseLines = (workout.exercises || workout.description || '')
    .split('\n')
    .map(line => line.trim())
    .filter(Boolean)
  const runningDetails = workout.sessionDetails || workout.description

  function handleBackdrop(e) {
    if (e.target === e.currentTarget) onClose()
  }

  function handleSave(e) {
    e.preventDefault()
    onEdit(form)
    setEditing(false)
  }

  async function handleSaveComment() {
    if (commentSaving) return
    setCommentSaving(true)
    try {
      await onSaveComment(workout, commentDraft.trim())
    } finally {
      setCommentSaving(false)
    }
  }

  if (editing) {
    return (
      <div className="modal-backdrop" onClick={handleBackdrop}>
        <div className="modal add-modal">
          <button className="modal-close" onClick={() => setEditing(false)}><SystemIcon name="close" className="system-icon" /></button>
          <h2 className="modal-title-h2">Rediger økt</h2>
          <form onSubmit={handleSave}>
            <WorkoutForm value={form} onChange={setForm} showScheduleFields />
            <div className="form-actions workout-detail-form-actions">
              <button type="button" className="btn-cancel" onClick={() => setEditing(false)}>Avbryt</button>
              <button type="submit" className="btn-save">Lagre</button>
            </div>
          </form>
        </div>
      </div>
    )
  }

  const zoneColorVar = zone && colors ? colors.border : typeColors.border

  return (
    <div className="modal-backdrop" onClick={handleBackdrop}>
      <div className="modal workout-detail-modal" style={{ '--zone-color': zoneColorVar }}>
        <WorkoutDetailHeader
          onClose={onClose}
          icon={icon}
          scheduleLabel={scheduleLabel}
          title={workout.title}
          typeLabel={typeLabel}
          activityTag={activityTag}
          loadTag={loadTag}
        />

        <WorkoutDetailSections
          workout={workout}
          isRunningWorkout={isRunningWorkout}
          isStrengthWorkout={isStrengthWorkout}
          runningDetails={runningDetails}
          exerciseLines={exerciseLines}
        />

        <div className="modal-section">
          <div className="section-label">Kommentar på økten</div>
          <textarea
            className="workout-comment-input"
            value={commentDraft}
            onChange={e => setCommentDraft(e.target.value)}
            placeholder="Skriv hvordan økten gikk, justeringer eller annet du vil følge opp."
            rows={4}
          />
          <div className="comment-actions">
            <button
              className="btn-save-comment"
              onClick={handleSaveComment}
              disabled={
                commentSaving
                || commentDraft.trim() === (workout.userComment || '').trim()
              }
            >
              {commentSaving ? 'Lagrer...' : 'Lagre kommentar'}
            </button>
          </div>
        </div>

        {zone && colors && zoneLabel && (
          <ZoneSummary
            zones={zones}
            colors={colors}
            zoneLabel={zoneLabel}
            onClick={() => setShowScale(true)}
          />
        )}

        {zone && showScale && <IntensityScaleModal onClose={() => setShowScale(false)} />}

        <div className="modal-actions">
          <button
            className={`btn-complete${workout.completed ? ' done' : ''}`}
            onClick={() => onToggleComplete(workout)}
          >
            {workout.completed ? 'Fullført' : 'Marker som fullført'}
          </button>
          {onReplace && canEdit && (
            <button className="btn-edit" onClick={() => onReplace(workout)}><SystemIcon name="replace" className="button-icon" />Bytt</button>
          )}
          {canEdit && onEdit && (
            <button className="btn-edit" onClick={() => setEditing(true)}><SystemIcon name="edit" className="button-icon" />Rediger</button>
          )}
          {canEdit && onDelete && (
            <button className="btn-delete" onClick={() => onDelete(workout)}><SystemIcon name="delete" className="button-icon" />Slett</button>
          )}
        </div>
      </div>
    </div>
  )
}
