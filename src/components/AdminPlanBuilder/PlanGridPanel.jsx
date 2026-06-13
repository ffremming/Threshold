import MonthGridPanel from './MonthGridPanel'
import QuickBuildBar from './QuickBuildBar'
import { useQuickBuild } from './useQuickBuild'

// Quick-build view. Looks identical to the month view — it renders the exact
// MonthGridPanel — with a single quick-build bar on top: one starting volume +
// a unit toggle + a ramp % that generates sessions across a week span from the
// bank, building around whatever's already on the calendar.
export default function PlanGridPanel(props) {
  const {
    overviewWeeks, overviewWorkoutsByWeekKey, plan, templates, onAddManySessions, resolveMuscles,
  } = props

  const quick = useQuickBuild({
    plan, overviewWeeks, overviewWorkoutsByWeekKey, templates, onAddManySessions, resolveMuscles,
  })

  return (
    <div className="pb-quick-panel">
      <QuickBuildBar overviewWeeks={overviewWeeks} onGenerate={quick.generate} />
      <MonthGridPanel {...props} />
    </div>
  )
}
