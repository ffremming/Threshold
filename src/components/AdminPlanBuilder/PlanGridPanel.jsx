import MonthGridPanel from './MonthGridPanel'
import QuickBuildSidebar from './QuickBuildSidebar'
import { useQuickBuild } from './useQuickBuild'

// Quick-build view. The calendar looks identical to the month view — it renders
// the exact MonthGridPanel — with a left settings sidebar holding every
// block-level parameter (volume + ramp, week span, hard sessions/week, quality
// weight sliders, activity split). Generate fills the span from the bank,
// building around whatever's already on the calendar.
export default function PlanGridPanel(props) {
  const {
    overviewWeeks, overviewWorkoutsByWeekKey, plan, templates, onAddManySessions, resolveMuscles,
  } = props

  const quick = useQuickBuild({
    plan, overviewWeeks, overviewWorkoutsByWeekKey, templates, onAddManySessions, resolveMuscles,
  })

  return (
    <div className="pb-qb-layout">
      <QuickBuildSidebar overviewWeeks={overviewWeeks} onGenerate={quick.generate} />
      <div className="pb-qb-calendar">
        <MonthGridPanel {...props} />
      </div>
    </div>
  )
}
