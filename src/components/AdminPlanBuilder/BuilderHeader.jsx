import { WeekNav } from '../ui'
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
}) {
  return (
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
  )
}
