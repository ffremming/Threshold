import MuscleMap from '../Strength/MuscleMap'
import { muscleLoadToHighlighterData } from '../../strength/selectors'
import './MuscleHeatmap.css'

// Body figure tinted by how much each muscle was worked.
// `musclesWorked` is the engine's { datasetMuscle: totalSets } map.
// Renders nothing when there is no strength work — so it self-hides on
// pure-cardio weeks (week-plan requirement: only show if the week has strength).
export default function MuscleHeatmap({ musclesWorked, title = 'Muscles trained', size = 170, className = '' }) {
  const muscles = musclesWorked || {}
  if (Object.keys(muscles).length === 0) return null

  const data = muscleLoadToHighlighterData(muscles)
  if (data.length === 0) return null

  return (
    <div className={`muscle-heatmap ${className}`.trim()}>
      {title && <h4 className="muscle-heatmap-title">{title}</h4>}
      <MuscleMap data={data} size={size} />
    </div>
  )
}
