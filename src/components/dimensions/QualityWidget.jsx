import { Card } from '../ui'
import QualityRadar from './QualityRadar'
import QualityBars from './QualityBars'
import './QualityWidget.css'

// Week-plan widget: radar (shape at a glance) + horizontal bars (exact values),
// driven by the same dims. `dims` is the engine's per-week 0–100 scores.
export default function QualityWidget({ dims = {}, title = 'Training quality', className = '' }) {
  return (
    <Card className={`q-widget ${className}`.trim()}>
      {title && <h3 className="q-widget-title">{title}</h3>}
      <div className="q-widget-body">
        <div className="q-widget-radar">
          <QualityRadar dims={dims} size={220} />
        </div>
        <div className="q-widget-bars">
          <QualityBars dims={dims} />
        </div>
      </div>
    </Card>
  )
}
