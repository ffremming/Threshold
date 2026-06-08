import Model from 'react-body-highlighter'
import { INTENSITY_TIERS } from '../../strength/selectors'

// Electric-Blue intensity ramp, lightest → strongest. Length MUST equal
// INTENSITY_TIERS — react-body-highlighter indexes this by `frequency - 1`.
const HIGHLIGHT_COLORS = ['#BFD3FF', '#7FA8FF', '#3D6BFF', '#0052FF']

const BODY_COLOR = '#E2E8F0' // slate-200, matches the muted surface tone

// Renders an anatomical figure (front + back) with muscles tinted by training
// volume. `data` is the array produced by buildHighlighterData / exerciseHighlighterData.
export default function MuscleMap({ data = [], size = 180, className = '' }) {
  const style = { width: size, height: 'auto' }
  return (
    <div className={`th-muscle-map ${className}`.trim()}>
      <div className="th-muscle-map-figure">
        <Model
          data={data}
          type="anterior"
          bodyColor={BODY_COLOR}
          highlightedColors={HIGHLIGHT_COLORS}
          style={style}
        />
        <span className="th-muscle-map-caption">Front</span>
      </div>
      <div className="th-muscle-map-figure">
        <Model
          data={data}
          type="posterior"
          bodyColor={BODY_COLOR}
          highlightedColors={HIGHLIGHT_COLORS}
          style={style}
        />
        <span className="th-muscle-map-caption">Back</span>
      </div>
    </div>
  )
}

export { INTENSITY_TIERS, HIGHLIGHT_COLORS }
