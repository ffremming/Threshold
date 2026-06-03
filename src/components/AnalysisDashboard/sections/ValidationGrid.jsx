import { ChartCard, Stat } from './primitives'
import { validateTraining } from '../../../strava/trainingValidation'

export default function ValidationGrid({ focusWeek }) {
  if (!focusWeek) return null
  const v = validateTraining(focusWeek)
  const d = v.distribution
  return (
    <div className="validation-grid">
      <ChartCard title="Intensity distribution" caption={`Polarization: ${v.polarization}`}>
        <Stat label="Easy (Z1–2)" value={`${d.easyPct}%`} />
        <Stat label="Threshold (Z3)" value={`${d.thresholdPct}%`} />
        <Stat label="Hard (Z4–5)" value={`${d.hardPct}%`} />
      </ChartCard>
      <ChartCard title="Threshold / VO2max">
        <Stat label="Time in Z4–5" value={`${v.thresholdVo2.minutes} min`} />
        <Stat label="Share" value={`${v.thresholdVo2.pct}%`} />
      </ChartCard>
      <ChartCard title="Speed work">
        <Stat label="Detected" value={v.speedWork.hasSpeedWork ? 'Yes' : 'No'} />
        <Stat label="Fast efforts" value={v.speedWork.fastLaps} />
      </ChartCard>
      <ChartCard title="Muscular work">
        <Stat label="Strength load share" value={`${v.muscular.share}%`} />
      </ChartCard>
      <ChartCard title="Specificity">
        <Stat label="Primary discipline" value={v.specificity.primary || '—'} />
        <Stat label="In-discipline share" value={`${v.specificity.pct}%`} />
      </ChartCard>
      {v.flags.length > 0 && (
        <ChartCard title="Planning flags">
          <ul className="validation-flags">
            {v.flags.map((f, i) => <li key={i}>{f}</li>)}
          </ul>
        </ChartCard>
      )}
    </div>
  )
}
