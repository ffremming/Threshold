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
import { getSessionDomain } from '../../sessionBlocks'
import { inferActivityTag } from '../../utils'
import WorkoutForm from '../WorkoutForm'
import IntensityScaleModal from '../IntensityScaleModal'
import SystemIcon from '../SystemIcon'
import WorkoutDetailHeader from './WorkoutDetailHeader'
import WorkoutDetailSections from './WorkoutDetailSections'
import ZoneSummary from './ZoneSummary'
import '../WorkoutDetail.css'

export default function WorkoutDetail({ workout, onClose, canEdit, onDelete, onToggleComplete, onEdit, onSaveComment, onReplace, onDuplicate }) {
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

  // Close on Escape unless the user is editing or has a nested modal open.
  useEffect(() => {
    if (!workout || editing) return
    function handleKeyDown(event) {
      if (event.key === 'Escape') {
        event.stopPropagation()
        if (showScale) setShowScale(false)
        else onClose()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [workout, editing, showScale, onClose])

  if (!workout) return null

  // The measurement domain is driven by the activity (run/swim/strength/…),
  // never the legacy intensity-type. Strength sessions must never show km/pace.
  const resolvedActivityTag = workout.activityTag || inferActivityTag(workout)
  const sessionDomain = getSessionDomain(resolvedActivityTag)
  const isStrengthWorkout = sessionDomain === 'strength'
  // Strength sessions are sets/reps/load based: no intensity zone and no
  // interval/continuous type. Suppress both from the detail view entirely.
  const zones = isStrengthWorkout ? [] : normalizeIntensityZones(workout.type, workout.intensityZone)
  const zone = isStrengthWorkout ? null : normalizeIntensityZone(workout.type, workout.intensityZone)
  const colors = zone ? ZONE_COLORS[zone] : null
  const typeColors = TYPE_COLORS[workout.type] || TYPE_COLORS.annet
  const icon = isStrengthWorkout ? null : (TYPE_ICONS[workout.type] || 'AN')
  const typeLabel = isStrengthWorkout
    ? null
    : (WORKOUT_TYPES.find(t => t.value === workout.type)?.label || workout.type)
  const zoneLabel = formatIntensityZoneLabel(zones)
  const activityTag = workout.activityTag ? ACTIVITY_TAG_MAP[workout.activityTag] : null
  const loadTag = workout.loadTag ? LOAD_TAG_MAP[workout.loadTag] : null
  const scheduleLabel = formatWorkoutSchedule(workout)
  const isDistanceWorkout = sessionDomain === 'distance'
  const exerciseLines = (workout.exercises || workout.description || '')
    .split('\n')
    .map(line => line.trim())
    .filter(Boolean)
  const sessionInstructions = workout.sessionDetails || workout.description

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
        <div className="modal add-modal" role="dialog" aria-modal="true" aria-label="Edit session">
          <button className="modal-close" onClick={() => setEditing(false)} aria-label="Close"><SystemIcon name="close" className="system-icon" /></button>
          <h2 className="modal-title-h2">Edit session</h2>
          <form onSubmit={handleSave}>
            <WorkoutForm value={form} onChange={setForm} showScheduleFields />
            <div className="form-actions workout-detail-form-actions">
              <button type="button" className="btn-cancel" onClick={() => setEditing(false)}>Cancel</button>
              <button type="submit" className="btn-save">Save</button>
            </div>
          </form>
        </div>
      </div>
    )
  }

  const zoneColorVar = zone && colors ? colors.border : typeColors.border

  return (
    <div className="modal-backdrop" onClick={handleBackdrop}>
      <div
        className="modal workout-detail-modal"
        style={{ '--zone-color': zoneColorVar }}
        role="dialog"
        aria-modal="true"
        aria-label={workout.title || 'Session details'}
      >
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
          isDistanceWorkout={isDistanceWorkout}
          isStrengthWorkout={isStrengthWorkout}
          sessionInstructions={sessionInstructions}
          exerciseLines={exerciseLines}
        />

        <div className="modal-section">
          <div className="section-label">Comment on the session</div>
          <textarea
            className="workout-comment-input"
            value={commentDraft}
            onChange={e => setCommentDraft(e.target.value)}
            placeholder="Write how the session went, adjustments, or anything else to follow up."
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
              {commentSaving ? 'Saving...' : 'Save comment'}
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
            {workout.completed ? 'Completed' : 'Mark as completed'}
          </button>
          {onReplace && canEdit && (
            <button className="btn-edit" onClick={() => onReplace(workout)}><SystemIcon name="replace" className="button-icon" />Swap</button>
          )}
          {onDuplicate && canEdit && (
            <button className="btn-edit" onClick={() => onDuplicate(workout)}><SystemIcon name="duplicate" className="button-icon" />Duplicate</button>
          )}
          {canEdit && onEdit && (
            <button className="btn-edit" onClick={() => setEditing(true)}><SystemIcon name="edit" className="button-icon" />Edit</button>
          )}
          {canEdit && onDelete && (
            <button className="btn-delete" onClick={() => onDelete(workout)}><SystemIcon name="delete" className="button-icon" />Delete</button>
          )}
        </div>
      </div>
    </div>
  )
}
