import { useState } from 'react'
import { Download } from 'lucide-react'
import { getWeekDates, getWeekNumber } from '../../../utils'
import { Page, WeekNav, EmptyState, Toolbar, ToolbarGroup, Button } from '../../ui'
import WeekOverview from '../WeekOverview'
import ExportPlanModal from '../ExportPlanModal'

function toISO(date) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export default function PlanTab(props) {
  const {
    currentWeek, currentYear, monday, sunday, isThisWeek,
    onWeekChange, prevWeek, nextWeek,
    workouts, loadingWorkouts,
    athletes, selectedAthleteId,
    setSelectedWorkout,
  } = props

  const [exportOpen, setExportOpen] = useState(false)
  const { monday: exportMonday, sunday: exportSunday } = getWeekDates(currentWeek, currentYear)

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

      <Toolbar>
        <ToolbarGroup label="Export">
          <Button onClick={() => setExportOpen(true)}>
            <Download size={16} strokeWidth={2} aria-hidden="true" />
            Export to Excel
          </Button>
        </ToolbarGroup>
      </Toolbar>

      {loadingWorkouts
        ? <EmptyState title="Loading…" />
        : <WeekOverview workouts={workouts} onSelectWorkout={setSelectedWorkout} />}

      <ExportPlanModal
        open={exportOpen}
        onClose={() => setExportOpen(false)}
        athletes={athletes}
        selectedAthleteId={selectedAthleteId}
        defaultStart={toISO(exportMonday)}
        defaultEnd={toISO(exportSunday)}
      />
    </Page>
  )
}
