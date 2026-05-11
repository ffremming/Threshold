import { useEffect, useMemo, useState } from 'react'
import { collection, onSnapshot, query, where } from 'firebase/firestore'
import { db } from '../firebase'
import { getAdjacentWeek, getWeekNumber, chunkArray } from '../utils'
import {
  Button,
  IconButton,
  PageShell,
  ShellBrand,
  Page,
  Section,
  EmptyState,
  Badge,
} from './ui'
import SystemIcon from './SystemIcon'
import AthleteDetail from './AthleteDetail'
import './AthleteOverview.css'

export default function AthleteOverview({
  user,
  userProfile,
  athletes,
  onClose,
}) {
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

  const alertCount = coachableAthletes.filter(a => (workoutCountByAthlete[a.uid] || 0) === 0).length

  return (
    <PageShell
      brand={<ShellBrand eyebrow="Trener" title="Utøvere" />}
      actions={
        <Button variant="ghost" size="sm" onClick={onClose}>
          <SystemIcon name="close" className="button-icon" />
          Lukk
        </Button>
      }
    >
      <Page>
        <Section
          title="Oversikt"
          subtitle={
            alertCount > 0
              ? `${alertCount} utøver${alertCount === 1 ? '' : 'e'} mangler økter neste uke (uke ${nextWeek.week})`
              : `Alle utøvere har økter neste uke (uke ${nextWeek.week})`
          }
        />

        {coachableAthletes.length === 0 ? (
          <EmptyState
            title="Ingen utøvere"
            description="Du har ingen utøvere koblet til deg ennå."
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
                        {athlete.displayName || athlete.email || 'Uten navn'}
                        {hasAlert && (
                          <span
                            className="tp-athlete-alert-dot"
                            title="Ingen økter neste uke"
                            aria-label="Ingen økter neste uke"
                          />
                        )}
                      </span>
                      <span className="tp-athlete-row-meta">
                        {hasAlert
                          ? 'Ingen økter neste uke'
                          : `${count} økt${count === 1 ? '' : 'er'} neste uke`}
                      </span>
                    </div>
                  </div>
                  <div className="tp-athlete-row-side">
                    {hasAlert && <Badge className="tp-athlete-alert-badge">Mangler plan</Badge>}
                    <IconButton ariaLabel="Åpne utøver">
                      <span aria-hidden="true">›</span>
                    </IconButton>
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
