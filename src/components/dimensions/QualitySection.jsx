import { useMemo } from 'react'
import QualityTrendChart from './QualityTrendChart'
import MuscleHeatmap from './MuscleHeatmap'
import { scoreWeek } from '../../utils'
import { makeMuscleResolver } from './useMuscleResolver'
import './QualitySection.css'

const resolveMuscles = makeMuscleResolver()

// Analysis-view section: the five-quality trend chart (weekly stimulus +
// buildup) over the visible window, plus a muscle heatmap aggregated across
// that window. `weeklyStats` are the analysis dashboard's per-week stats; each
// carries `.workouts` (already filtered to completed for past weeks).
export default function QualitySection({ weeklyStats = [], labels = [], currentVisibleIndex = null }) {
  const { weeklyDims, windowMuscles } = useMemo(() => {
    const dims = []
    const muscles = {}
    for (const stat of weeklyStats) {
      const scored = scoreWeek(stat.workouts || [], { resolveMuscles })
      dims.push(scored.dims)
      for (const m of Object.keys(scored.musclesWorked)) {
        muscles[m] = (muscles[m] || 0) + scored.musclesWorked[m]
      }
    }
    return { weeklyDims: dims, windowMuscles: muscles }
  }, [weeklyStats])

  return (
    <div className="an-quality">
      <QualityTrendChart weeklyDims={weeklyDims} labels={labels} nowIndex={currentVisibleIndex} />
      <MuscleHeatmap musclesWorked={windowMuscles} title="Muscles trained in this period" size={180} />
    </div>
  )
}
