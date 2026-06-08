import {
  average,
  averageLastValues,
  getStandardDeviation,
  getWeekMetricValue,
  safeDivide,
  sumLastValues,
} from './utils'
import { buildWeekStats } from '../../utils/loadSignals'

function reduceTotals(weeklyStats) {
  return weeklyStats.reduce((acc, week) => {
    acc.distance += week.distance
    acc.duration += week.duration
    acc.load += week.load
    acc.mechanicalLoad += week.mechanicalLoad
    acc.count += week.count
    acc.hardSessions += week.hardSessions
    return acc
  }, { distance: 0, duration: 0, load: 0, mechanicalLoad: 0, count: 0, hardSessions: 0 })
}

function reduceActivityTotals(weeklyStats) {
  return weeklyStats.reduce((acc, week) => {
    Object.entries(week.activityLoad).forEach(([tag, load]) => {
      if (!acc[tag]) acc[tag] = { load: 0, duration: 0, distance: 0, count: 0 }
      acc[tag].load += load
    })
    Object.entries(week.activityDuration).forEach(([tag, duration]) => {
      if (!acc[tag]) acc[tag] = { load: 0, duration: 0, distance: 0, count: 0 }
      acc[tag].duration += duration
    })
    week.workouts.forEach(workout => {
      const tag = workout.activityTag || 'unknown'
      if (!acc[tag]) acc[tag] = { load: 0, duration: 0, distance: 0, count: 0 }
      acc[tag].distance += workout.distance
      acc[tag].count += 1
    })
    return acc
  }, {})
}

export function computeAnalysis(visibleWeeks, workoutsByWeekKey, activeTagFilter, currentWeek, currentYear, primaryMetric) {
  const weeklyStats = visibleWeeks.map(week =>
    buildWeekStats(week, workoutsByWeekKey, currentWeek, currentYear, activeTagFilter))

  const currentWeekIndex = weeklyStats.findIndex(w => w.week.week === currentWeek && w.week.year === currentYear)
  const focusWeekIndex = currentWeekIndex >= 0 ? currentWeekIndex : weeklyStats.length - 1
  const hasData = weeklyStats.some(week => week.count > 0)
  const allWorkouts = weeklyStats.flatMap(week => week.workouts)
  const loadSeries = weeklyStats.map(week => week.load)

  const weeklyStatsWithSignals = weeklyStats.map((week, index) => {
    const acuteLoad = averageLastValues(loadSeries, 3, index)
    const chronicLoad = averageLastValues(loadSeries, 6, index)
    const readinessRatio = safeDivide(acuteLoad, chronicLoad)
    return { ...week, acuteLoad, chronicLoad, readinessRatio }
  })

  const focusWeek = weeklyStatsWithSignals[focusWeekIndex] || null
  const totals = reduceTotals(weeklyStatsWithSignals)

  const zoneTotals = weeklyStatsWithSignals.reduce((acc, week) => {
    Object.entries(week.zones).forEach(([zone, minutes]) => { acc[zone] = (acc[zone] || 0) + minutes })
    return acc
  }, {})

  const zoneLoadTotals = weeklyStatsWithSignals.reduce((acc, week) => {
    Object.entries(week.zoneLoads).forEach(([zone, load]) => { acc[zone] = (acc[zone] || 0) + load })
    return acc
  }, {})

  const activityTotals = reduceActivityTotals(weeklyStatsWithSignals)
  const topActivityEntries = Object.entries(activityTotals).sort(([, a], [, b]) => b.load - a.load).slice(0, 5)

  const peakWeek = weeklyStatsWithSignals.reduce((best, week) => {
    if (!best || getWeekMetricValue(week, primaryMetric) > getWeekMetricValue(best, primaryMetric)) return week
    return best
  }, null)

  const recentIndex = Math.max(0, weeklyStatsWithSignals.length - 1)
  const metricSeries = weeklyStatsWithSignals.map(week => getWeekMetricValue(week, primaryMetric))
  const recentValue = sumLastValues(metricSeries, 3, recentIndex)
  const previousValue = sumLastValues(metricSeries, 3, Math.max(0, recentIndex - 3))
  const trendDelta = previousValue > 0 ? ((recentValue - previousValue) / previousValue) * 100 : 0

  const focusDailyLoads = focusWeek?.dailyLoads || []
  const monotony = (() => {
    const activeDays = focusDailyLoads.filter(value => value > 0)
    if (activeDays.length < 2) return 0
    return safeDivide(average(activeDays), getStandardDeviation(activeDays))
  })()

  const strain = focusWeek ? Math.round(focusWeek.load * monotony) : 0
  const density = totals.duration > 0 ? Math.round((totals.load / totals.duration) * 60) : 0
  const consistencyScore = weeklyStatsWithSignals.length > 0
    ? Math.round((weeklyStatsWithSignals.filter(w => w.count >= 3).length / weeklyStatsWithSignals.length) * 100)
    : 0
  const topWorkouts = allWorkouts.slice().sort((a, b) => b.load - a.load).slice(0, 5)

  return {
    weeklyStats: weeklyStatsWithSignals, focusWeek, hasData, totals, zoneTotals, zoneLoadTotals,
    topActivityEntries, peakWeek, trendDelta, monotony, strain, density, consistencyScore, topWorkouts,
  }
}
