import { Card } from '../../ui'
import { WEEKDAY_LABELS } from '../constants'
import { getWeekLabel } from '../utils'
import HeatCell from './HeatCell'
import TopWorkoutRow from './TopWorkoutRow'
import './bottom.css'

export default function BottomGrid({ weeklyStats, topWorkouts }) {
  return (
    <div className="an-bottom-grid">
      <Card className="an-surface">
        <header className="an-insight-head">
          <span className="an-eyebrow">Ukerytme</span>
          <h3 className="an-insight-title">Load heatmap</h3>
        </header>
        <p className="an-insight-copy">Hvor belastningen lander i uka. Mørkere felt betyr hardere dager.</p>
        <div className="an-heatmap">
          <div className="an-heatmap-header">
            <span>Uke</span>
            {WEEKDAY_LABELS.map(day => <span key={day}>{day}</span>)}
          </div>
          {weeklyStats.map(week => (
            <div key={week.week.key} className="an-heatmap-row">
              <span className="an-heatmap-label">{getWeekLabel(week.week)}</span>
              {WEEKDAY_LABELS.map((day, index) => (
                <HeatCell key={`${week.week.key}-${day}`} week={week} weekdayIndex={index} weekdayLabel={day} />
              ))}
            </div>
          ))}
        </div>
      </Card>

      <Card className="an-surface">
        <header className="an-insight-head">
          <span className="an-eyebrow">Nøkkeløkter</span>
          <h3 className="an-insight-title">Toppbelastning</h3>
        </header>
        <p className="an-insight-copy">Liste sortert på estimert load for å finne de mest krevende stimulusene.</p>
        <div className="an-top-list">
          {topWorkouts.length > 0
            ? topWorkouts.map(workout => <TopWorkoutRow key={workout.id} workout={workout} />)
            : <div className="an-empty-mini">Ingen økter i perioden</div>}
        </div>
      </Card>
    </div>
  )
}
