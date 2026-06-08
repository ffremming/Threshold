import Model from 'react-body-highlighter'
import {
  datasetMusclesForRegion,
  muscleLabel,
  toHighlighterMuscles,
} from '../../strength/muscles'

const SELECTED_COLOR = ['#0052FF']
const BODY_COLOR = '#E2E8F0'

// A clickable anatomical figure used to filter the exercise list by muscle.
// Clicking a region selects it (calls onSelect with the dataset muscle names it
// covers); clicking the already-selected region clears the filter.
export default function MuscleFilter({ selected = [], onChange, size = 120 }) {
  // Highlight whichever regions correspond to the currently selected muscles.
  const data = selected.length
    ? [{ name: 'selected', muscles: regionKeysFor(selected), frequency: 1 }]
    : []

  function handleClick(stats) {
    const region = stats?.muscle
    if (!region) return
    const datasetMuscles = datasetMusclesForRegion(region)
    if (datasetMuscles.length === 0) return
    // Toggle: clicking the active region clears the filter.
    const isActive = datasetMuscles.some(m => selected.includes(m))
    onChange(isActive ? [] : datasetMuscles)
  }

  const style = { width: size, height: 'auto', cursor: 'pointer' }
  const label = selected.length ? muscleLabel(selected[0]) : 'Tap a muscle'

  return (
    <div className="th-muscle-filter">
      <div className="th-muscle-map">
        <div className="th-muscle-map-figure">
          <Model data={data} type="anterior" bodyColor={BODY_COLOR}
            highlightedColors={SELECTED_COLOR} onClick={handleClick} style={style} />
        </div>
        <div className="th-muscle-map-figure">
          <Model data={data} type="posterior" bodyColor={BODY_COLOR}
            highlightedColors={SELECTED_COLOR} onClick={handleClick} style={style} />
        </div>
      </div>
      <div className="th-muscle-filter-foot">
        <span className="th-muscle-filter-label">{label}</span>
        {selected.length > 0 && (
          <button type="button" className="th-muscle-filter-clear" onClick={() => onChange([])}>
            Clear
          </button>
        )}
      </div>
    </div>
  )
}

// All highlighter region keys that the given dataset muscles map onto.
function regionKeysFor(datasetMuscles) {
  return toHighlighterMuscles(datasetMuscles)
}
