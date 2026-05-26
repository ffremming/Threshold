import { useEffect, useMemo, useState } from 'react'
import { ChevronRight } from 'lucide-react'
import { collection, onSnapshot, query, where } from 'firebase/firestore'
import { db } from '../firebase'
import { getAdjacentWeek, getWeekNumber, chunkArray } from '../utils'
import {
  PageShell,
  Page,
  EmptyState,
  Badge,
} from './ui'
import { useNav } from '../App/primaryNav'
import AthleteDetail from './AthleteDetail'
import './AthleteOverview.css'

export default function AthleteOverview({
  user,
  userProfile,
  athletes,
}) {
  const nav = useNav()
  const today = new Date()
  const currentWeek = getWeekNumber(today)
  const currentYear = today.getFullYear()
  const nextWeek = useMemo(
    () => getAdjacentWeek(currentWeek, currentYear, 1),
    [currentWeek, currentYear],
  )

  const [workoutCountByAthlete, setWorkoutCountByAthlete] = useState({})
  const [selectedAthleteId, setSelectedAthleteId] = useState(null)

  // Only show athletes who aren't the coach themselves.
  const coachableAthletes = useMemo(
    () => (athletes || []).filter(a => a.uid !== userProfile?.uid),
    [athletes, userProfile?.uid],
  )

  // Subscribe to next-week workout counts per athlete (batched in chunks of 10).
  useEffect(() => {
    if (coachableAthletes.length === 0) {
      setWorkoutCountByAthlete({})
      return
    }
    const ids = coachableAthletes.map(a => a.uid)
    const chunks = chunkArray(ids, 10)
    const partial = {}
    ids.forEach(id => { partial[id] = 0 })

    const unsubs = chunks.map(chunk => onSnapshot(
      query(
        collection(db, 'workouts'),
        where('athleteId', 'in', chunk),
        where('year', '==', nextWeek.year),
        where('week', '==', nextWeek.week),
      ),
      snap => {
        const counts = { ...partial }
        chunk.forEach(id => { counts[id] = 0 })
        snap.docs.forEach(d => {
          const athleteId = d.data().athleteId
          counts[athleteId] = (counts[athleteId] || 0) + 1
        })
        setWorkoutCountByAthlete(prev => ({ ...prev, ...counts }))
      },
      () => {},
    ))

    return () => unsubs.forEach(u => u())
  }, [coachableAthletes, nextWeek.week, nextWeek.year])

  const selectedAthlete = coachableAthletes.find(a => a.uid === selectedAthleteId) || null

  if (selectedAthlete) {
    return (
      <AthleteDetail
        athlete={selectedAthlete}
        coach={userProfile}
        currentUser={user}
        onBack={() => setSelectedAthleteId(null)}
      />
    )
  }

  return (
    <PageShell
      nav={nav?.items}
      navActive="athletes"
      onNavChange={nav?.onChange}
      account={nav?.account}
      selectedAthlete={nav?.selectedAthlete}
    >
      <Page>
        {coachableAthletes.length === 0 ? (
          <EmptyState
            title="No athletes"
            description="You have no athletes linked to you yet."
          />
        ) : (
          <div className="tp-athlete-list">
            {coachableAthletes.map(athlete => {
              const count = workoutCountByAthlete[athlete.uid] ?? 0
              const hasAlert = count === 0
              return (
                <button
                  type="button"
                  key={athlete.uid}
                  className={`tp-athlete-row${hasAlert ? ' tp-athlete-row--alert' : ''}`}
                  onClick={() => setSelectedAthleteId(athlete.uid)}
                >
                  <div className="tp-athlete-row-main">
                    <div className="tp-athlete-row-avatar" aria-hidden="true">
                      {(athlete.displayName || '?').slice(0, 1).toUpperCase()}
                    </div>
                    <div className="tp-athlete-row-info">
                      <span className="tp-athlete-row-name">
                        {athlete.displayName || athlete.email || 'No name'}
                        {hasAlert && (
                          <span
                            className="tp-athlete-alert-dot"
                            title="No sessions next week"
                            aria-label="No sessions next week"
                          />
                        )}
                      </span>
                      <span className="tp-athlete-row-meta">
                        {hasAlert
                          ? 'No sessions next week'
                          : `${count} session${count === 1 ? '' : 's'} next week`}
                      </span>
                    </div>
                  </div>
                  <div className="tp-athlete-row-side">
                    {hasAlert && <Badge className="tp-athlete-alert-badge">Missing plan</Badge>}
                    <ChevronRight className="tp-athlete-row-chevron" aria-hidden="true" size={18} />
                  </div>
                </button>
              )
            })}
          </div>
        )}
      </Page>
    </PageShell>
  )
}
