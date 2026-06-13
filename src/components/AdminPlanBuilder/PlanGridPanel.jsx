import { useState } from 'react'
import { Plus } from 'lucide-react'
import { weekTargetKey } from '../../utils/weekTargetTypes'
import { usePlanTargets } from './usePlanTargets'
import WeekRulePanel from './WeekRulePanel'
import DayIntensityTag from './DayIntensityTag'
import ReplaceSessionButton from './ReplaceSessionButton'
import GenerateBar from './GenerateBar'
import './styles/plan.css'

const WEEKDAYS = [1, 2, 3, 4, 5, 6, 7]

// The Plan-view calendar. Mirrors the month grid (week rows × 7 day columns) but
// the left column is a per-week rule editor and each day cell carries an
// intensity tag and per-session Replace buttons. A top bar generates a selected
// week range from the bank to hit each week's targets.
export default function PlanGridPanel({
  overviewWeeks, overviewWorkoutsByWeekKey, plan, planActions, templates,
  onAddManySessions, onAddSessionToDay, onSelectWorkout, onDeleteWorkout, resolveMuscles,
}) {
  const targets = usePlanTargets({
    plan, planActions, overviewWeeks, overviewWorkoutsByWeekKey, templates,
    onAddManySessions, resolveMuscles,
  })
  const [selection, setSelection] = useState([]) // [{week,year}]

  const inSelection = (week, year) =>
    selection.some(s => s.week === week && s.year === year)

  function toggleWeekSelect(week, year) {
    setSelection(prev => inSelection(week, year)
      ? prev.filter(s => !(s.week === week && s.year === year))
      : [...prev, { week, year }])
  }

  // Replace one placed session: re-solve its slot, then delete the old and insert
  // the chosen replacement on the same day in a single batched write.
  function handleReplace(workout) {
    const swap = targets.replaceSession(workout)
    if (swap && swap.session) {
      onDeleteWorkout(workout)
      onAddManySessions([{
        session: swap.session,
        week: Number(workout.week),
        year: Number(workout.year),
        weekday: Number(workout.weekday),
      }])
    }
  }

  const settings = plan?.planSettings || { rampPct: 0 }

  return (
    <div className="pb-plan-panel">
      <GenerateBar
        selection={selection}
        onGenerate={() => targets.generate(selection)}
        settings={settings}
        onSettingsChange={targets.setSettings}
      />
      <div className="pb-plan-grid">
        {(overviewWeeks || []).map(w => {
          const key = weekTargetKey(w.week, w.year)
          const workouts = overviewWorkoutsByWeekKey?.[key] || []
          const weekTarget = targets.getTarget(w.week, w.year)
          const resolvedTarget = targets.resolved.get(key) || null
          return (
            <div key={key} className={`pb-plan-row${inSelection(w.week, w.year) ? ' is-selected' : ''}`}>
              <div className="pb-plan-rule-col">
                <button
                  type="button"
                  className="pb-plan-week-btn"
                  onClick={() => toggleWeekSelect(w.week, w.year)}
                  aria-pressed={inSelection(w.week, w.year)}
                >
                  W{w.week}
                </button>
                <WeekRulePanel
                  weekTarget={weekTarget}
                  resolvedTarget={resolvedTarget}
                  workouts={workouts}
                  onChange={patch => targets.setTarget(w.week, w.year, patch)}
                />
              </div>
              {WEEKDAYS.map(wd => {
                const dayWorkouts = workouts.filter(x => Number(x.weekday) === wd)
                const tag = weekTarget?.dayTags?.[wd] || null
                return (
                  <div key={wd} className="pb-plan-cell">
                    <div className="pb-plan-cell-head">
                      <DayIntensityTag value={tag} onChange={t => targets.setDayTag(w.week, w.year, wd, t)} />
                    </div>
                    {dayWorkouts.map(workout => (
                      <div
                        key={workout.id}
                        className="pb-plan-chip"
                        onClick={() => onSelectWorkout(workout)}
                      >
                        <span className="pb-plan-chip-title">{workout.title}</span>
                        <ReplaceSessionButton workout={workout} onReplace={handleReplace} />
                      </div>
                    ))}
                    <button
                      type="button"
                      className="pb-plan-add"
                      aria-label={`Add session to week ${w.week} day ${wd}`}
                      onClick={() => onAddSessionToDay(w.week, w.year, wd)}
                    >
                      <Plus size={12} aria-hidden="true" />
                    </button>
                  </div>
                )
              })}
            </div>
          )
        })}
      </div>
    </div>
  )
}
