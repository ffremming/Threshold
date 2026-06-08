import { useMemo } from 'react'
import { buildHighlighterData } from '../../strength/selectors'
import MuscleMap from './MuscleMap'
import './strength.css'

// Aggregate "what did this session work" diagram. Renders nothing unless at
// least one exercise section references a library exercise with set volume.
export default function SessionMuscleMap({ sections = [], size = 150, title = 'Muscles worked' }) {
  const data = useMemo(() => buildHighlighterData(sections), [sections])
  if (data.length === 0) return null
  return (
    <div className="th-session-muscles">
      <span className="th-session-muscles-title">{title}</span>
      <MuscleMap data={data} size={size} />
    </div>
  )
}
