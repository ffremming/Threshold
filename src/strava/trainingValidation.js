import { ACTIVITY_TAG_MAP } from '../utils/activity'

const round = n => Math.round(n)
const pct = (part, total) => (total > 0 ? round((part / total) * 100) : 0)

// % of zone-minutes in easy (Z1-2), threshold (Z3), hard (Z4-5).
export function intensityDistribution(zoneTotals) {
  const z = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, ...(zoneTotals || {}) }
  const total = z[1] + z[2] + z[3] + z[4] + z[5]
  return {
    totalMinutes: total,
    easyPct: pct(z[1] + z[2], total),
    thresholdPct: pct(z[3], total),
    hardPct: pct(z[4] + z[5], total),
  }
}

// Polarized: lots of easy + meaningful hard, little Z3.
// Threshold: Z3 dominates the quality work.
// Pyramidal: easy base, more Z3 than Z4-5.
export function classifyPolarization(dist) {
  const { easyPct, thresholdPct, hardPct } = dist
  if (thresholdPct >= 25) return 'threshold'
  if (easyPct >= 75 && hardPct >= thresholdPct) return 'polarized'
  return 'pyramidal'
}

export function thresholdVo2Load(zoneTotals) {
  const z = { 4: 0, 5: 0, ...(zoneTotals || {}) }
  const all = intensityDistribution(zoneTotals).totalMinutes
  const minutes = z[4] + z[5]
  return { minutes, pct: pct(minutes, all) }
}

// Lap-based speed-work detection: a lap whose pace is >=15% faster than the
// time-weighted average lap speed counts as a fast effort.
export function detectSpeedWork(laps) {
  const valid = (laps || []).filter(l => l.averageSpeed > 0 && l.movingTime > 0)
  if (valid.length < 2) return { hasSpeedWork: false, fastLaps: 0 }
  const totalTime = valid.reduce((s, l) => s + l.movingTime, 0)
  const avgSpeed = valid.reduce((s, l) => s + l.averageSpeed * l.movingTime, 0) / totalTime
  const fastLaps = valid.filter(l => l.averageSpeed >= avgSpeed * 1.15).length
  return { hasSpeedWork: fastLaps > 0, fastLaps }
}

const STRENGTH_TAGS = new Set(
  Object.values(ACTIVITY_TAG_MAP).filter(t => t.group === 'strength').map(t => t.value)
)

export function muscularShare(activityLoad) {
  const entries = Object.entries(activityLoad || {})
  const total = entries.reduce((s, [, v]) => s + v, 0)
  const muscular = entries.filter(([tag]) => STRENGTH_TAGS.has(tag)).reduce((s, [, v]) => s + v, 0)
  return pct(muscular, total)
}

const ENDURANCE_TAGS = new Set(
  Object.values(ACTIVITY_TAG_MAP).filter(t => t.group === 'endurance').map(t => t.value)
)

export function specificityShare(activityLoad) {
  const endurance = Object.entries(activityLoad || {}).filter(([tag]) => ENDURANCE_TAGS.has(tag))
  const total = endurance.reduce((s, [, v]) => s + v, 0)
  if (total === 0) return { primary: null, pct: 0 }
  const primary = endurance.sort((a, b) => b[1] - a[1])[0]
  return { primary: primary[0], pct: pct(primary[1], total) }
}

// Combine all dimensions for a single week's stats into a validation report.
export function validateTraining(weekStats) {
  const distribution = intensityDistribution(weekStats.zones)
  const polarization = classifyPolarization(distribution)
  const thresholdVo2 = thresholdVo2Load(weekStats.zones)

  const laps = (weekStats.workouts || []).flatMap(w => w.laps || [])
  const speedWork = detectSpeedWork(laps)

  const mShare = muscularShare(weekStats.activityLoad)
  const muscular = { share: mShare, flag: mShare === 0 ? 'none' : (mShare < 10 ? 'low' : 'ok') }

  const specificity = specificityShare(weekStats.activityLoad)

  const flags = []
  if (distribution.totalMinutes > 0 && distribution.easyPct < 70) {
    flags.push('Too little easy volume — aim for ~80% easy.')
  }
  if (thresholdVo2.minutes === 0 && distribution.totalMinutes > 0) {
    flags.push('No threshold/VO2max stimulus this week.')
  }
  if (muscular.flag === 'none') flags.push('No muscular/strength work this week.')
  if (polarization === 'threshold') flags.push('Threshold-heavy — risk of grey-zone training.')

  return { distribution, polarization, thresholdVo2, speedWork, muscular, specificity, flags }
}
