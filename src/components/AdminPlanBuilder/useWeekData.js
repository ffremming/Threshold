import { useMemo } from 'react'
import {
  ACTIVITY_TAGS,
  compareWorkoutsBySchedule,
  estimateMechanicalLoad,
  estimateWorkoutDuration,
  estimateWorkoutLoad,
  getWorkoutDistance,
  groupWorkoutsByWeekday,
  isHardWorkout,
} from '../../utils'
import { averageLastValues, safeDivide } from './mathUtils'

export function useWeekData({ workouts, analysisWeeks, analysisWorkoutsByWeekKey, currentWeek, currentYear }) {
  const sortedWorkouts = useMemo(() => (
    [...workouts].sort(compareWorkoutsBySchedule)
  ), [workouts])

  const groupedWorkouts = useMemo(() => (
    groupWorkoutsByWeekday(sortedWorkouts)
  ), [sortedWorkouts])

  const weekStats = useMemo(() => {
    const totalDuration = workouts.reduce((sum, workout) => sum + estimateWorkoutDuration(workout), 0)
    const totalLoad = workouts.reduce((sum, workout) => sum + estimateWorkoutLoad(workout), 0)
    const totalMechanicalLoad = workouts.reduce((sum, workout) => sum + estimateMechanicalLoad(workout), 0)
    const hardCount = workouts.filter(workout => isHardWorkout(workout)).length
    const easyCount = workouts.length - hardCount

    const distanceByActivity = ACTIVITY_TAGS.map(tag => {
      const total = workouts.reduce((sum, workout) => (
        workout.activityTag === tag.value ? sum + (getWorkoutDistance(workout) || 0) : sum
      ), 0)

      return { ...tag, total }
    }).filter(tag => tag.total > 0)

    return {
      totalDuration,
      totalLoad,
      totalMechanicalLoad,
      hardCount,
      easyCount,
      sessionCount: workouts.length,
      distanceByActivity,
    }
  }, [workouts])

  const dailyLoadChartData = useMemo(() => {
    const days = groupWorkoutsByWeekday(workouts)
    return {
      labels: days.map(day => day.shortLabel),
      datasets: [
        {
          label: 'Load',
          data: days.map(day => day.workouts.reduce((sum, workout) => sum + estimateWorkoutLoad(workout), 0)),
          backgroundColor: 'rgba(37, 99, 235, 0.82)',
          borderRadius: 10,
        },
        {
          label: 'Mekanisk load',
          data: days.map(day => day.workouts.reduce((sum, workout) => sum + estimateMechanicalLoad(workout), 0)),
          backgroundColor: 'rgba(14, 165, 233, 0.42)',
          borderRadius: 10,
        },
      ],
    }
  }, [workouts])

  const distanceDistributionChartData = useMemo(() => ({
    labels: weekStats.distanceByActivity.map(activity => activity.label),
    datasets: [{
      data: weekStats.distanceByActivity.map(activity => Number(activity.total.toFixed(1))),
      backgroundColor: weekStats.distanceByActivity.map(activity => activity.color),
      borderWidth: 0,
    }],
  }), [weekStats.distanceByActivity])

  const loadMixChartData = useMemo(() => {
    const hardLoad = workouts
      .filter(workout => isHardWorkout(workout))
      .reduce((sum, workout) => sum + estimateWorkoutLoad(workout), 0)
    const easyLoad = workouts
      .filter(workout => !isHardWorkout(workout))
      .reduce((sum, workout) => sum + estimateWorkoutLoad(workout), 0)

    return {
      labels: ['Hard belastning', 'Rolig belastning'],
      datasets: [{
        data: [hardLoad, easyLoad],
        backgroundColor: ['#f97316', '#22c55e'],
        borderWidth: 0,
      }],
    }
  }, [workouts])

  const performanceTrend = useMemo(() => {
    const weeklyStats = analysisWeeks.map(week => {
      const weekWorkouts = analysisWorkoutsByWeekKey[week.key] || []
      const distance = weekWorkouts.reduce((sum, workout) => sum + (getWorkoutDistance(workout) || 0), 0)
      const load = weekWorkouts.reduce((sum, workout) => sum + estimateWorkoutLoad(workout), 0)
      return { week, load, distance }
    })

    const loadSeries = weeklyStats.map(week => week.load)
    const weeksWithSignals = weeklyStats.map((week, index) => {
      const acuteLoad = averageLastValues(loadSeries, 3, index)
      const chronicLoad = averageLastValues(loadSeries, 6, index)
      const trainingReadiness = safeDivide(acuteLoad, chronicLoad)
      return { ...week, acuteLoad, trainingReadiness }
    })

    const currentIndex = weeksWithSignals.findIndex(week => (
      week.week.week === currentWeek && week.week.year === currentYear
    ))

    return { currentIndex, weeklyStats: weeksWithSignals }
  }, [analysisWeeks, analysisWorkoutsByWeekKey, currentWeek, currentYear])

  const trendChartData = useMemo(() => {
    const labels = performanceTrend.weeklyStats.map(entry => `Uke ${entry.week.week}`)
    return {
      labels,
      datasets: [
        {
          label: 'Acute load',
          data: performanceTrend.weeklyStats.map(week => Number(week.acuteLoad.toFixed(1))),
          borderColor: '#f97316',
          backgroundColor: 'rgba(249, 115, 22, 0.14)',
          fill: true,
          tension: 0.3,
          pointRadius: context => context.dataIndex === performanceTrend.currentIndex ? 4 : 2,
        },
        {
          label: 'Km',
          data: performanceTrend.weeklyStats.map(week => Number(week.distance.toFixed(1))),
          borderColor: '#2563eb',
          tension: 0.28,
          pointRadius: context => context.dataIndex === performanceTrend.currentIndex ? 4 : 2,
        },
        {
          label: 'Training readiness',
          data: performanceTrend.weeklyStats.map(week => Number(week.trainingReadiness.toFixed(2))),
          borderColor: '#7c3aed',
          borderDash: [6, 6],
          tension: 0.22,
          pointRadius: context => context.dataIndex === performanceTrend.currentIndex ? 4 : 2,
          yAxisID: 'y1',
        },
      ],
    }
  }, [performanceTrend])

  const focusTrendWeek = performanceTrend.weeklyStats[performanceTrend.currentIndex] || null

  return {
    sortedWorkouts,
    groupedWorkouts,
    weekStats,
    dailyLoadChartData,
    distanceDistributionChartData,
    loadMixChartData,
    trendChartData,
    focusTrendWeek,
  }
}
