import ActivityIcon from '../ActivityIcon'
import { dateToColumn, columnToPercent, dayDiff } from '../../utils/planGeometry'
import { goalPriorityWeight } from '../../utils/planTypes'
import { ACTIVITY_TAG_MAP } from '../../utils'

// Priority-weighted competition markers for ONE week. Each goal sits on its day
// column; A races read boldest (weight 1), C subtlest. Past goals dim; the week
// view shows a day countdown. Clicking a marker opens its editor.
export default function GoalStrip({ goals, weekMonday, view, today, onEditGoal }) {
  const placed = []
  for (const goal of goals || []) {
    const col = dateToColumn(goal.date, weekMonday)
    if (col == null) continue
    placed.push({ goal, col })
  }
  if (placed.length === 0) return null

  const todayStr = today
  return (
    <div className="pb-goal-strip">
      {placed.map(({ goal, col }) => {
        const weight = goalPriorityWeight(goal.priority)
        const sport = ACTIVITY_TAG_MAP[goal.sport]
        const daysAway = todayStr ? dayDiff(todayStr, goal.date) : null
        const isPast = daysAway != null && daysAway < 0
        const className = [
          'pb-goal-marker',
          `pb-goal-marker--p${weight}`,
          isPast ? 'is-past' : '',
        ].filter(Boolean).join(' ')
        // Countdown only in week view, only for upcoming goals within reason.
        const countdown = view === 'week' && daysAway != null && daysAway >= 0
          ? (daysAway === 0 ? 'today' : `-${daysAway}d`)
          : null
        return (
          <button
            type="button"
            key={goal.id}
            className={className}
            style={{
              left: `${columnToPercent(col) + 100 / 14}%`, // center of the column
              '--pb-goal-color': sport?.color || 'var(--th-accent)',
            }}
            onClick={event => { event.stopPropagation(); onEditGoal?.(goal) }}
            title={`${goal.priority ? `[${goal.priority}] ` : ''}${goal.name}${goal.target ? ` — ${goal.target}` : ''}`}
          >
            <span className="pb-goal-flag" aria-hidden="true">
              {sport?.icon
                ? <ActivityIcon name={sport.icon} className="pb-goal-icon" />
                : <span className="pb-goal-dot" />}
            </span>
            <span className="pb-goal-name">
              <span className="pb-goal-prio">{goal.priority}</span>
              {goal.name}
              {countdown && <span className="pb-goal-countdown">{countdown}</span>}
            </span>
          </button>
        )
      })}
    </div>
  )
}
