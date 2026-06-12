import { scoreSession } from '../../utils'
import './DailyLoadChart.css'

// Blue ramp (light → deep) shared with the muscle heatmap, used here to shade
// each day's bar by how hard the day is relative to the week's hardest day.
const LOAD_SHADES = ['#BFD3FF', '#7FA8FF', '#3D6BFF', '#0052FF']

function loadShade(load, maxLoad) {
  if (load <= 0) return '#E2E8F0' // rest day — muted slate
  const t = load / maxLoad // 0..1 relative to the week's peak
  const idx = Math.min(LOAD_SHADES.length - 1, Math.floor(t * LOAD_SHADES.length))
  return LOAD_SHADES[idx]
}

// A compact per-day load bar row, aligned to the 7 weekday columns of the week
// timetable. `days` is groupWorkoutsByWeekday output: [{ value, shortLabel,
// workouts }, ...]. Load is the new Edwards HR-zone TRIMP (same as the cards);
// bars are shaded in blue by relative load so hard vs easy days separate by hue.
export default function DailyLoadChart({ days = [], resolveMuscles, className = '' }) {
  const dailyLoads = days.map((day) =>
    (day.workouts || []).reduce((sum, w) => sum + (scoreSession(w, { resolveMuscles }).load || 0), 0)
  )
  const maxLoad = Math.max(1, ...dailyLoads)
  const weekTotal = dailyLoads.reduce((a, b) => a + b, 0)

  if (weekTotal === 0) return null

  return (
    <div className={`dlc ${className}`.trim()}>
      <div className="dlc-head">
        <span className="dlc-title">Daily load</span>
        <span className="dlc-total th-num">{weekTotal}</span>
      </div>
      <div className="dlc-row">
        {days.map((day, i) => {
          const load = dailyLoads[i]
          const heightPct = Math.round((load / maxLoad) * 100)
          return (
            <div className="dlc-col" key={day.value}>
              <span className={`dlc-value th-num${load === 0 ? ' is-zero' : ''}`}>{load || ''}</span>
              <div className="dlc-track">
                <div
                  className="dlc-bar"
                  style={{ height: `${heightPct}%`, background: loadShade(load, maxLoad) }}
                  title={`${day.shortLabel}: ${load} load`}
                />
              </div>
              <span className="dlc-day">{day.shortLabel}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
