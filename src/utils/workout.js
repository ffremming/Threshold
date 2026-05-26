import { inferActivityTag } from './activity'
import { normalizeIntensityZones, formatIntensityZoneLabel } from './intensity'
import { normalizeLoadTag } from './load'
import {
  WEEKDAY_OPTIONS,
  getDateStringForWeekday,
  getWeekdayFromDate,
  getWeekdayMeta,
  normalizeWeekday,
} from './weekday'

export function getDefaultWarmup(_type, activityTag = '') {
  if (activityTag === 'run') return '10-15 min easy jog + 3-4 strides'
  if (activityTag === 'walking') return '10-15 min easy walk with gradual progression'
  if (activityTag === 'bike') return '10-15 min easy cycling with gradual progression'
  if (activityTag === 'swim') return '200-400 m easy swim-in + technique'
  if (activityTag === 'xc_skiing') return '10-15 min easy diagonal/skating + drills'
  if (activityTag === 'strength') return '10-15 min general warmup + activation'
  return '10-15 min easy warmup'
}

export function getDefaultCooldown(_type, activityTag = '') {
  if (activityTag === 'run') return '5-10 min easy jog or walk'
  if (activityTag === 'walking') return '5-10 min easy walk and light mobility'
  if (activityTag === 'bike') return '10 min easy cycling'
  if (activityTag === 'swim') return '100-200 m easy swim-out'
  if (activityTag === 'xc_skiing') return '5-10 min easy cooldown'
  if (activityTag === 'strength') return '5-10 min easy cooldown and light mobility'
  return '5-10 min easy cooldown'
}

export function normalizeWorkout(workout) {
  const intensityZones = normalizeIntensityZones(workout.type, workout.intensityZone)
  const activityTag = inferActivityTag(workout)
  const weekday = workout.weekday || getWeekdayFromDate(workout.date)
  const normalizedWeekday = normalizeWeekday(weekday)
  const date = workout.date || getDateStringForWeekday(workout.week, workout.year, normalizedWeekday)
  return {
    ...workout,
    activityTag,
    date,
    cooldown: workout.cooldown?.trim?.() || getDefaultCooldown(workout.type, activityTag),
    time: workout.time || '',
    loadTag: normalizeLoadTag(workout.type, intensityZones, workout.loadTag),
    warmup: workout.warmup?.trim?.() || getDefaultWarmup(workout.type, activityTag),
    weekday: normalizedWeekday,
    intensityZone: intensityZones,
    userComment: workout.userComment || '',
    blocks: workout.blocks || null,
  }
}

export function formatWorkoutDate(dateValue) {
  if (!dateValue) return ''
  const [year, month, day] = String(dateValue).split('-').map(Number)
  if (!year || !month || !day) return String(dateValue)
  return `${String(day).padStart(2, '0')}.${String(month).padStart(2, '0')}.${year}`
}

export function formatWorkoutSchedule(workout, options = {}) {
  const { includeWeekday = true, includeDate = true } = options
  const parts = []
  const weekdayMeta = workout ? getWeekdayMeta(workout.weekday || getWeekdayFromDate(workout.date)) : null
  const formattedDate = formatWorkoutDate(workout?.date)

  if (includeWeekday && weekdayMeta) parts.push(weekdayMeta.label)
  if (includeDate && formattedDate) parts.push(formattedDate)

  const schedule = parts.join(' · ')
  if (workout?.time) {
    return schedule ? `${schedule} at ${workout.time}` : `At ${workout.time}`
  }
  return schedule
}

export function formatWorkoutTime(workout) {
  return workout?.time ? `At ${workout.time}` : ''
}

export function compareWorkoutsBySchedule(a, b) {
  const byWeekday = normalizeWeekday(a?.weekday || getWeekdayFromDate(a?.date))
    - normalizeWeekday(b?.weekday || getWeekdayFromDate(b?.date))
  if (byWeekday !== 0) return byWeekday

  const aTime = a?.time || '99:99'
  const bTime = b?.time || '99:99'
  const byTime = aTime.localeCompare(bTime)
  if (byTime !== 0) return byTime

  return (a?.order ?? 0) - (b?.order ?? 0)
}

export function groupWorkoutsByWeekday(workouts) {
  const grouped = WEEKDAY_OPTIONS.map(day => ({ ...day, workouts: [] }))
  workouts.forEach(workout => {
    const weekday = normalizeWeekday(workout.weekday || getWeekdayFromDate(workout.date))
    grouped[weekday - 1].workouts.push(workout)
  })
  grouped.forEach(day => day.workouts.sort(compareWorkoutsBySchedule))
  return grouped
}

export function getIntensityZoneLabel(workout) {
  const zones = normalizeIntensityZones(workout.type, workout.intensityZone)
  return formatIntensityZoneLabel(zones)
}

export const TEMPLATE_CATEGORIES = [
  'Interval',
  'Threshold',
  'Easy',
  'Treadmill + strength',
  'Strength',
  'Other',
]
