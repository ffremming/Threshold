import { getWeekNumber } from '../../../utils'
import { Page, WeekNav, EmptyState } from '../../ui'
import WeekOverview from '../WeekOverview'

export default function PlanTab(props) {
  const {
    currentWeek, currentYear, monday, sunday, isThisWeek,
    onWeekChange, prevWeek, nextWeek,
    workouts, loadingWorkouts,
  } = props

  return (
    <Page>
      <WeekNav
        week={currentWeek}
        year={currentYear}
        monday={monday}
        sunday={sunday}
        isThisWeek={isThisWeek}
        onPrev={prevWeek}
        onNext={nextWeek}
        onToday={() => onWeekChange(getWeekNumber(new Date()), new Date().getFullYear())}
      />

      {loadingWorkouts
        ? <EmptyState title="Loading…" />
        : <WeekOverview workouts={workouts} />}
    </Page>
  )
}
