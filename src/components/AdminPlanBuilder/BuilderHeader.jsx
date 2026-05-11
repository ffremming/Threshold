import BirdsEyeOverview from '../BirdsEyeOverview'
import { IconButton, WeekNav } from '../ui'
import { getWeekNumber } from '../../utils'

export default function BuilderHeader({
  currentWeek,
  currentYear,
  monday,
  sunday,
  isThisWeek,
  prevWeek,
  nextWeek,
  onWeekChange,
  showOverview,
  setShowOverview,
  loadingOverview,
  overviewWeeks,
  overviewWorkoutsByWeekKey,
  selectedWeekKey,
}) {
  return (
    <>
      <WeekNav
        week={currentWeek}
        year={currentYear}
        monday={monday}
        sunday={sunday}
        isThisWeek={isThisWeek}
        onPrev={prevWeek}
        onNext={nextWeek}
        onToday={() => onWeekChange(getWeekNumber(new Date()), new Date().getFullYear())}
        rightSlot={
          <IconButton
            ariaLabel="Vis ukeoversikt"
            variant={showOverview ? undefined : 'ghost'}
            onClick={() => setShowOverview(p => !p)}
          >
            <span className="pb-overview-glyph" aria-hidden="true"><span /><span /><span /><span /></span>
          </IconButton>
        }
      />

      {showOverview && (
        loadingOverview ? (
          <div className="pb-overview-loading" id="admin-builder-overview">Laster ukeoversikt…</div>
        ) : (
          <div className="pb-overview-wrap" id="admin-builder-overview">
            <BirdsEyeOverview
              weeks={overviewWeeks}
              workoutsByWeekKey={overviewWorkoutsByWeekKey}
              selectedWeekKey={selectedWeekKey}
              onSelectWeek={(week, year) => {
                onWeekChange(week, year)
                setShowOverview(false)
              }}
            />
          </div>
        )
      )}
    </>
  )
}
