import { Timestamp } from 'firebase-admin/firestore'

function toTimestamp(iso) {
  return iso ? Timestamp.fromDate(new Date(iso)) : null
}

export function normalizeActivity(detail, athleteId, coachId) {
  const hasHr = !!detail.has_heartrate
  return {
    athleteId,
    coachId,
    source: 'strava',
    stravaActivityId: detail.id,
    name: detail.name || '',
    type: detail.sport_type || detail.type || '',
    startDate: toTimestamp(detail.start_date),
    movingTime: detail.moving_time ?? null,
    elapsedTime: detail.elapsed_time ?? null,
    distance: detail.distance ?? null,
    totalElevation: detail.total_elevation_gain ?? null,
    averageHeartrate: hasHr ? (detail.average_heartrate ?? null) : null,
    maxHeartrate: hasHr ? (detail.max_heartrate ?? null) : null,
    averageWatts: detail.average_watts ?? null,
    laps: (detail.laps || []).map(l => ({
      index: l.lap_index ?? null,
      distance: l.distance ?? null,
      movingTime: l.moving_time ?? null,
      startDate: toTimestamp(l.start_date),
      averageCadence: l.average_cadence ?? null,
      averageWatts: l.average_watts ?? null,
      averageSpeed: l.average_speed ?? null,
    })),
  }
}

// Pure: given aligned time[] + values[], split values into per-lap windows.
// laps: [{ startOffset (seconds), elapsed (seconds) }]
export function sliceStreamByLaps(time, values, laps) {
  return laps.map(({ startOffset, elapsed }) => {
    const end = startOffset + elapsed
    const out = []
    for (let i = 0; i < time.length; i++) {
      if (time[i] >= startOffset && time[i] <= end) out.push(values[i])
    }
    return out
  })
}
