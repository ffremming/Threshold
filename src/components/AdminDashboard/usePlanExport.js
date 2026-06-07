import { useCallback, useState } from 'react'
import { compareWorkoutsBySchedule } from '../../utils'
import { weeksInDateRange } from '../../utils/dateRange'
import { fetchWorkoutsOnce } from '../../workoutFetch'
import {
  buildPlanWorkbook,
  downloadPlanWorkbook,
  planExportFilename,
} from './buildPlanWorkbook'

function inRange(workout, startDate, endDate) {
  return workout.date && workout.date >= startDate && workout.date <= endDate
}

function bySchedule(a, b) {
  if (a.date !== b.date) return a.date < b.date ? -1 : 1
  return compareWorkoutsBySchedule(a, b)
}

// athletes: full list (for name lookup + all-athletes scope)
export function usePlanExport(athletes) {
  const [status, setStatus] = useState('idle') // idle | loading | empty | error

  const runExport = useCallback(async ({ athleteId, startDate, endDate, selectedFieldKeys }) => {
    setStatus('loading')
    try {
      const weeks = weeksInDateRange(startDate, endDate)
      const isAll = athleteId === 'all'
      const targetIds = isAll ? athletes.map(a => a.uid) : [athleteId]

      const nameById = Object.fromEntries(
        athletes.map(a => [a.uid, a.displayName || a.email || a.uid])
      )

      const batches = await Promise.all(
        targetIds.map(id =>
          fetchWorkoutsOnce({ athleteId: id, weeks }).then(ws =>
            ws.map(w => ({ ...w, athleteId: w.athleteId || id }))
          )
        )
      )

      const workouts = batches
        .flat()
        .filter(w => inRange(w, startDate, endDate))
        .sort(bySchedule)

      if (workouts.length === 0) {
        setStatus('empty')
        return { ok: false, reason: 'empty' }
      }

      const wb = buildPlanWorkbook({
        workouts,
        selectedFieldKeys,
        includeAthleteColumn: isAll,
        athleteNameById: nameById,
      })

      const athleteName = isAll ? null : nameById[athleteId]
      downloadPlanWorkbook(wb, planExportFilename(athleteName, startDate, endDate))

      setStatus('idle')
      return { ok: true }
    } catch (err) {
      console.error('[planExport] failed', err)
      setStatus('error')
      return { ok: false, reason: 'error' }
    }
  }, [athletes])

  const resetStatus = useCallback(() => setStatus('idle'), [])

  return { status, runExport, resetStatus }
}
