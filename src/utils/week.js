export function getWeekNumber(date) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7))
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
  return Math.ceil((((d - yearStart) / 86400000) + 1) / 7)
}

export function getISOWeeksInYear(year) {
  const dec28 = new Date(Date.UTC(year, 11, 28))
  return getWeekNumber(dec28)
}

export function getWeekDates(week, year) {
  const jan4 = new Date(year, 0, 4)
  const startOfWeek1 = new Date(jan4)
  startOfWeek1.setDate(jan4.getDate() - ((jan4.getDay() + 6) % 7))
  const monday = new Date(startOfWeek1)
  monday.setDate(startOfWeek1.getDate() + (week - 1) * 7)
  const sunday = new Date(monday)
  sunday.setDate(monday.getDate() + 6)
  return { monday, sunday }
}

export function getAdjacentWeek(week, year, direction) {
  if (direction < 0) {
    if (week === 1) {
      const previousYear = year - 1
      return { week: getISOWeeksInYear(previousYear), year: previousYear }
    }
    return { week: week - 1, year }
  }
  const weeksInYear = getISOWeeksInYear(year)
  if (week >= weeksInYear) return { week: 1, year: year + 1 }
  return { week: week + 1, year }
}

export function getWeekSequence(startWeek, startYear, count) {
  const weeks = []
  let cursor = { week: startWeek, year: startYear }
  for (let index = 0; index < count; index += 1) {
    const { monday, sunday } = getWeekDates(cursor.week, cursor.year)
    weeks.push({
      week: cursor.week,
      year: cursor.year,
      monday,
      sunday,
      key: `${cursor.year}-${String(cursor.week).padStart(2, '0')}`,
    })
    cursor = getAdjacentWeek(cursor.week, cursor.year, 1)
  }
  return weeks
}

export function getWeekWindow(centerWeek, centerYear, beforeCount, afterCount) {
  let start = { week: centerWeek, year: centerYear }
  for (let index = 0; index < beforeCount; index += 1) {
    start = getAdjacentWeek(start.week, start.year, -1)
  }
  return getWeekSequence(start.week, start.year, beforeCount + afterCount + 1)
}

export function getWeekKey(week, year) {
  return `${year}-${String(week).padStart(2, '0')}`
}

export function getWeekOffsetFromAnchor(targetWeek, targetYear, anchorWeek, anchorYear) {
  if (targetYear === anchorYear) return targetWeek - anchorWeek
  let offset = 0
  if (targetYear > anchorYear) {
    offset += getISOWeeksInYear(anchorYear) - anchorWeek
    for (let year = anchorYear + 1; year < targetYear; year += 1) {
      offset += getISOWeeksInYear(year)
    }
    offset += targetWeek
    return offset
  }
  offset -= anchorWeek
  for (let year = anchorYear - 1; year > targetYear; year -= 1) {
    offset -= getISOWeeksInYear(year)
  }
  offset -= getISOWeeksInYear(targetYear) - targetWeek
  return offset
}

// Absolute day index for a (week, year, weekday), anchored to an arbitrary
// fixed point. Lets callers compute and re-apply (week, weekday) offsets that
// roll correctly across week and year boundaries — used by month-grid
// copy/paste and multi-move to preserve a selection's shape relative to a
// paste target. Anchor cancels out of any offset, so its value is irrelevant.
const DAY_INDEX_ANCHOR = { week: 1, year: 2000 }

export function getDayIndex(week, year, weekday) {
  const weekOffset = getWeekOffsetFromAnchor(week, year, DAY_INDEX_ANCHOR.week, DAY_INDEX_ANCHOR.year)
  return weekOffset * 7 + (weekday - 1)
}

export function getCellFromDayIndex(dayIndex) {
  const weekOffset = Math.floor(dayIndex / 7)
  const weekday = (dayIndex % 7) + 1
  let cursor = { week: DAY_INDEX_ANCHOR.week, year: DAY_INDEX_ANCHOR.year }
  const direction = weekOffset >= 0 ? 1 : -1
  for (let i = 0; i < Math.abs(weekOffset); i += 1) {
    cursor = getAdjacentWeek(cursor.week, cursor.year, direction)
  }
  return { week: cursor.week, year: cursor.year, weekday }
}

export function getWeeklyProgressionTarget(
  week,
  year,
  startingDistance = 17,
  growthFactor = 1.07,
  anchorWeek = 13,
  anchorYear = 2026
) {
  const weekOffset = getWeekOffsetFromAnchor(week, year, anchorWeek, anchorYear)
  return Number((startingDistance * Math.pow(growthFactor, weekOffset)).toFixed(2))
}

export function getWeeklyProgressionTargets(
  weeks,
  startingDistance = 17,
  growthFactor = 1.07,
  anchorWeek = 13,
  anchorYear = 2026
) {
  const targets = new Map()
  weeks.forEach(week => {
    targets.set(
      week.key,
      getWeeklyProgressionTarget(week.week, week.year, startingDistance, growthFactor, anchorWeek, anchorYear)
    )
  })
  return targets
}
