import { describe, it, expect } from 'vitest'
import {
  stravaActivityToWorkoutShape, dominantHrZone, mergeStravaIntoAnalysis,
} from './activityToWorkout'

const activity = {
  id: 'strava_1', source: 'strava', stravaActivityId: 1,
  type: 'Run', name: 'Tempo',
  startDate: { seconds: Math.floor(new Date('2026-05-20T07:00:00Z').getTime() / 1000) },
  movingTime: 1800, distance: 5000,
  zones: [{ type: 'heartrate', distribution_buckets: [
    { min: 0, max: 120, time: 120 },
    { min: 120, max: 150, time: 200 },
    { min: 150, max: 170, time: 900 }, // dominant → bucket index 2 → zone 3
    { min: 170, max: 190, time: 100 },
  ] }],
}

describe('dominantHrZone', () => {
  it('returns the 1-based index of the bucket with the most time', () => {
    expect(dominantHrZone(activity.zones)).toBe(3)
  })
  it('returns null when no hr zones present', () => {
    expect(dominantHrZone(null)).toBeNull()
    expect(dominantHrZone([{ type: 'power', distribution_buckets: [] }])).toBeNull()
  })
})

describe('stravaActivityToWorkoutShape', () => {
  it('maps units the estimators understand', () => {
    const w = stravaActivityToWorkoutShape(activity)
    expect(w.activityTag).toBe('run')        // Run → run
    expect(w.distance).toBe('5.0 km')         // meters → "x.x km" string
    expect(w.notes).toContain('30 min')       // 1800s → 30 min text
    expect(w.intensityZone).toEqual([3])      // from dominant HR zone
    expect(w.completed).toBe(true)
    expect(w.source).toBe('strava')
    expect(w.week).toBeGreaterThan(0)         // ISO week derived from startDate
    expect(w.year).toBe(2026)
    expect(w.weekday).toBeGreaterThanOrEqual(1)
  })
})

describe('mergeStravaIntoAnalysis', () => {
  const planned = [
    { id: 'p1', activityTag: 'run', week: 20, year: 2026, weekday: 3, completed: false },
    { id: 'p2', activityTag: 'bike', week: 20, year: 2026, weekday: 5, completed: false },
  ]
  it('drops a planned workout that matches a strava activity (same week+weekday+tag)', () => {
    const stravaW = stravaActivityToWorkoutShape(activity) // run, week 21 area
    const merged = mergeStravaIntoAnalysis(planned, [
      { ...stravaW, week: 20, weekday: 3 }, // collides with p1
    ])
    const ids = merged.map(w => w.id)
    expect(ids).not.toContain('p1')   // planned run replaced by actual
    expect(ids).toContain('p2')       // unrelated planned bike kept
    expect(merged.some(w => w.source === 'strava')).toBe(true)
  })
})
