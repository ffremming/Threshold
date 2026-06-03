import { useEffect, useState } from 'react'
import { Line } from 'react-chartjs-2'
import {
  Chart, LineElement, PointElement, LinearScale, CategoryScale, Tooltip,
} from 'chart.js'
import { Button } from '../components/ui'
import { subscribeCompletedActivities, fetchActivityStreams } from './stravaClient'

Chart.register(LineElement, PointElement, LinearScale, CategoryScale, Tooltip)

export default function CompletedActivities({ athleteId }) {
  const [activities, setActivities] = useState([])
  const [openId, setOpenId] = useState(null)
  const [hr, setHr] = useState(null)
  const [loadingHr, setLoadingHr] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => subscribeCompletedActivities(athleteId, setActivities), [athleteId])

  async function showHr(activity) {
    setOpenId(activity.id)
    setHr(null); setError(''); setLoadingHr(true)
    try {
      const streams = await fetchActivityStreams(athleteId, activity.stravaActivityId)
      setHr({
        time: streams.time?.data || [],
        heartrate: streams.heartrate?.data || [],
      })
    } catch {
      setError('Could not load HR — the athlete may need to reconnect Strava.')
    } finally {
      setLoadingHr(false)
    }
  }

  return (
    <div className="space-y-3">
      {activities.length === 0 && <p className="text-sm text-gray-500">No imported activities yet.</p>}
      {activities.map(a => (
        <div key={a.id} className="rounded border p-3">
          <div className="flex items-center justify-between">
            <div>
              <div className="font-medium">{a.name || a.type}</div>
              <div className="text-xs text-gray-500">
                {a.type} · {(a.distance / 1000).toFixed(1)} km ·{' '}
                {Math.round((a.movingTime || 0) / 60)} min
                {a.averageHeartrate ? ` · avg ${Math.round(a.averageHeartrate)} bpm` : ''}
              </div>
            </div>
            <Button variant="ghost" size="sm" onClick={() => showHr(a)}>Show HR</Button>
          </div>
          {openId === a.id && (
            <div className="mt-3">
              {loadingHr && <p className="text-sm">Loading HR…</p>}
              {error && <p className="text-sm text-red-600">{error}</p>}
              {hr && hr.heartrate.length > 0 && (
                <Line
                  data={{
                    labels: hr.time,
                    datasets: [{
                      label: 'HR (bpm)', data: hr.heartrate,
                      borderColor: '#FC4C02', pointRadius: 0, borderWidth: 1.5,
                    }],
                  }}
                  options={{
                    animation: false,
                    scales: { x: { display: false } },
                    plugins: { legend: { display: false } },
                  }}
                />
              )}
              {hr && hr.heartrate.length === 0 && (
                <p className="text-sm text-gray-500">No HR data recorded for this activity.</p>
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  )
}
