import { describe, it, expect } from 'vitest'
import { normalizeActivity, sliceStreamByLaps } from '../strava/normalize.js'

const detail = {
  id: 123, name: 'Morning Run', sport_type: 'Run',
  start_date: '2026-06-01T07:00:00Z',
  moving_time: 1800, elapsed_time: 1850, distance: 5000,
  total_elevation_gain: 40, has_heartrate: true,
  average_heartrate: 150, max_heartrate: 175, average_watts: null,
  laps: [
    { lap_index: 1, distance: 2500, moving_time: 900, start_date: '2026-06-01T07:00:00Z', average_cadence: 80, average_watts: null, average_speed: 2.8 },
    { lap_index: 2, distance: 2500, moving_time: 900, start_date: '2026-06-01T07:15:00Z', average_cadence: 82, average_watts: null, average_speed: 2.9 },
  ],
}

describe('normalizeActivity', () => {
  it('maps core fields and trims laps', () => {
    const doc = normalizeActivity(detail, 'ath1', 'coach1')
    expect(doc.athleteId).toBe('ath1')
    expect(doc.coachId).toBe('coach1')
    expect(doc.source).toBe('strava')
    expect(doc.stravaActivityId).toBe(123)
    expect(doc.type).toBe('Run')
    expect(doc.distance).toBe(5000)
    expect(doc.averageHeartrate).toBe(150)
    expect(doc.laps).toHaveLength(2)
    expect(doc.laps[0]).toMatchObject({ index: 1, distance: 2500, movingTime: 900 })
  })
  it('omits heartrate fields when not present', () => {
    const doc = normalizeActivity({ id: 9, sport_type: 'Ride', has_heartrate: false, laps: [] }, 'a', 'c')
    expect(doc.averageHeartrate).toBeNull()
  })
})

describe('sliceStreamByLaps', () => {
  it('splits a stream into per-lap windows by time', () => {
    const time = [0, 10, 20, 30, 40]
    const heartrate = [100, 110, 120, 130, 140]
    // lap 1 covers t=0..20, lap 2 covers t=20..40
    const laps = [
      { startOffset: 0, elapsed: 20 },
      { startOffset: 20, elapsed: 20 },
    ]
    const result = sliceStreamByLaps(time, heartrate, laps)
    expect(result[0]).toEqual([100, 110, 120])
    expect(result[1]).toEqual([120, 130, 140])
  })
})
