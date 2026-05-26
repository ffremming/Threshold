import { ACTIVITY_TAG_MAP, formatDurationLabel, formatKmValue, formatWorkoutSchedule } from '../../../utils'
import ActivityIcon from '../../ActivityIcon'
import { Pill } from '../../ui'

export default function TopWorkoutRow({ workout }) {
  const activity = ACTIVITY_TAG_MAP[workout.activityTag]

  return (
    <article className="an-top-row">
      <span className="an-top-icon">
        <ActivityIcon name={activity?.icon || 'annet'} className="tag-icon-svg" />
      </span>
      <div className="an-top-main">
        <div className="an-top-head">
          <strong className="an-top-title">{workout.title || 'Untitled'}</strong>
          <Pill>{Math.round(workout.load)} load</Pill>
        </div>
        <div className="an-top-meta">
          <span>{activity?.label || 'Activity'}</span>
          <span>·</span>
          <span>{formatWorkoutSchedule(workout, { includeWeekday: true, includeDate: true })}</span>
          <span>·</span>
          <span>{formatDurationLabel(workout.duration)}</span>
          {workout.distance > 0 ? <><span>·</span><span>{formatKmValue(workout.distance)}</span></> : null}
        </div>
      </div>
    </article>
  )
}
