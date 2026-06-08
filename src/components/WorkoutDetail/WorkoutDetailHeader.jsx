import ActivityIcon from '../ActivityIcon'
import SystemIcon from '../SystemIcon'

export default function WorkoutDetailHeader({
  onClose,
  icon,
  scheduleLabel,
  title,
  typeLabel,
  activityTag,
  loadTag,
}) {
  return (
    <>
      <button className="modal-close" onClick={onClose} aria-label="Close"><SystemIcon name="close" className="system-icon" /></button>

      <div className="modal-header">
        {icon && <span className="modal-icon"><ActivityIcon name={icon} className="ui-icon" /></span>}
        <div>
          {scheduleLabel && <div className="modal-date">{scheduleLabel}</div>}
          <div className="modal-title">{title}</div>
          <div className="modal-type">
            {typeLabel}
            {activityTag && (
              <span
                className="activity-tag-pill"
                style={{ '--tag-color': activityTag.color, '--tag-bg': activityTag.bg }}
              >
                <span className="activity-tag-icon" aria-hidden="true"><ActivityIcon name={activityTag.icon} className="tag-icon-svg" /></span>
                <span>{activityTag.label}</span>
              </span>
            )}
            {loadTag && (
              <span
                className="load-tag-pill"
                style={{ '--load-color': loadTag.color, '--load-bg': loadTag.bg }}
              >
                <span>{loadTag.label}</span>
              </span>
            )}
          </div>
        </div>
      </div>
    </>
  )
}
