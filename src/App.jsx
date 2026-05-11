import { useState, useEffect, useMemo } from 'react'
import { onAuthStateChanged, signOut } from 'firebase/auth'
import {
  collection, query, where, onSnapshot,
  updateDoc, deleteDoc, doc, serverTimestamp, deleteField
} from 'firebase/firestore'
import { db, auth } from './firebase'
import {
  compareWorkoutsBySchedule,
  getDateStringForWeekday,
  getAdjacentWeek,
  getDefaultCooldown,
  getDefaultWarmup,
  getWeekKey,
  getWeekNumber,
  getWeekDates,
  getWeekWindow,
  groupWorkoutsByWeekday,
  normalizeLoadTag,
  normalizeIntensityZones,
  normalizeWorkout,
} from './utils'
import { mergeTemplates } from './templateLibrary'
import { subscribeToWorkoutWeeks } from './workoutSubscriptions'
import {
  getUserProfile,
  createUserProfile,
  onUserProfileSnapshot,
  onCoachAthletesSnapshot,
  onAllUsersSnapshot,
  updateUserProfile,
} from './userService'
import { hasRole } from './roles'
import WorkoutDetail from './components/WorkoutDetail'
import Login from './components/Login'
import AdminDashboard from './components/AdminDashboard'
import UserManagement from './components/UserManagement'
import BirdsEyeOverview from './components/BirdsEyeOverview'
import AthleteOverview from './components/AthleteOverview'
import SystemIcon from './components/SystemIcon'
import {
  Button,
  IconButton,
  PageShell,
  ShellBrand,
  Page,
  Section,
  EmptyState,
  WeekNav,
  AthletePicker,
  LayoutToggle,
  WorkoutCard,
  TemplateCard,
  Modal,
} from './components/ui'
import './components/AthleteHome.css'

export default function App() {
  const today = new Date()
  const [currentWeek, setCurrentWeek] = useState(getWeekNumber(today))
  const [currentYear, setCurrentYear] = useState(today.getFullYear())
  const [workouts, setWorkouts] = useState([])
  const [overviewWorkouts, setOverviewWorkouts] = useState([])
  const [loading, setLoading] = useState(true)
  const [overviewLoading, setOverviewLoading] = useState(true)

  const [user, setUser] = useState(undefined)
  const [userProfile, setUserProfile] = useState(null)
  const [profileLoading, setProfileLoading] = useState(true)
  const [profileError, setProfileError] = useState('')

  const [showLogin, setShowLogin] = useState(false)
  const [showAdmin, setShowAdmin] = useState(false)
  const [showUserManagement, setShowUserManagement] = useState(false)
  const [showAthleteOverview, setShowAthleteOverview] = useState(false)
  const [showOverview, setShowOverview] = useState(false)
  const [selectedWorkout, setSelectedWorkout] = useState(null)
  const [templates, setTemplates] = useState([])
  const [loadingTemplates, setLoadingTemplates] = useState(true)
  const [replacementTarget, setReplacementTarget] = useState(null)

  // Athletes for coach/superadmin
  const [athletes, setAthletes] = useState([])
  const [selectedAthleteId, setSelectedAthleteId] = useState(null)

  const overviewWeeks = useMemo(
    () => getWeekWindow(currentWeek, currentYear, 4, 4),
    [currentWeek, currentYear]
  )
  const overviewWeekKeys = useMemo(
    () => new Set(overviewWeeks.map(week => week.key)),
    [overviewWeeks]
  )
  const selectedWeekKey = getWeekKey(currentWeek, currentYear)

  // Role flags
  const isSuperadmin = hasRole(userProfile, 'superadmin')
  const isCoach = hasRole(userProfile, 'coach')
  const isAthlete = hasRole(userProfile, 'athlete')
  const canManageWorkouts = isSuperadmin || isCoach
  const workoutLayout = userProfile?.workoutLayout === 'calendar' ? 'calendar' : 'list'
  const selectedAthleteProfile = athletes.find(athlete => athlete.uid === selectedAthleteId) || null
  const adminWorkoutLayout = selectedAthleteProfile?.workoutLayout === 'calendar' ? 'calendar' : 'list'
  const viewedAthleteId = canManageWorkouts
    ? (selectedAthleteId || userProfile?.uid || user?.uid)
    : (userProfile?.uid || user?.uid)
  const activeHomeAthlete = canManageWorkouts
    ? (selectedAthleteProfile || (selectedAthleteId === userProfile?.uid ? userProfile : null))
    : userProfile
  const homeWorkoutLayout = canManageWorkouts ? adminWorkoutLayout : workoutLayout

  // ─── Auth state ───
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, u => setUser(u))
    return unsub
  }, [])

  // ─── User profile loading + auto-create superadmin ───
  useEffect(() => {
    if (!user) {
      setUserProfile(null)
      setProfileError('')
      setProfileLoading(false)
      return
    }

    setProfileLoading(true)
    setProfileError('')
    let cancelled = false

    async function initProfile() {
      try {
        const existing = await getUserProfile(user.uid)
        if (cancelled) return

        if (!existing) {
          const fallbackName = user.email?.split('@')[0] || 'bruker'
          await createUserProfile(user.uid, user.email || '', fallbackName, 'superadmin')
        }

        // Start real-time listener
        const unsub = onUserProfileSnapshot(user.uid, profile => {
          if (!cancelled) {
            setUserProfile(profile)
            setProfileLoading(false)
          }
        })

        return unsub
      } catch (error) {
        console.error('Failed to initialize user profile', error)
        if (!cancelled) {
          setUserProfile(null)
          setProfileError('Kunne ikke laste brukerprofilen. Prøv å laste siden på nytt.')
          setProfileLoading(false)
        }
        return null
      }
    }

    let unsubProfile = null
    initProfile().then(unsub => { unsubProfile = unsub })

    return () => {
      cancelled = true
      if (unsubProfile) unsubProfile()
    }
  }, [user])

  // ─── Load athletes for coach/superadmin ───
  useEffect(() => {
    if (!userProfile) {
      setAthletes([])
      setSelectedAthleteId(null)
      return
    }

    if (isCoach) {
      const unsub = onCoachAthletesSnapshot(userProfile.uid, athleteList => {
        const nextAthletes = [
          userProfile,
          ...athleteList.filter(a => a.uid !== userProfile.uid),
        ]

        setAthletes(nextAthletes)
        setSelectedAthleteId(prev => {
          if (prev && nextAthletes.some(a => a.uid === prev)) return prev
          return userProfile.uid
        })
      })
      return unsub
    }

    if (isSuperadmin) {
      const unsub = onAllUsersSnapshot(allUsers => {
        const athleteList = allUsers.filter(u => hasRole(u, 'athlete'))
        setAthletes(athleteList)
        setSelectedAthleteId(prev => {
          if (prev && allUsers.some(a => a.uid === prev)) return prev
          // Default to self, or first athlete
          if (allUsers.some(a => a.uid === userProfile.uid)) return userProfile.uid
          return athleteList.length > 0 ? athleteList[0].uid : userProfile.uid
        })
      })
      return unsub
    }

    setAthletes([])
    setSelectedAthleteId(userProfile.uid)
  }, [userProfile, isAthlete, isCoach, isSuperadmin])

  // ─── Home workouts listener (always scoped to current user) ───
  useEffect(() => {
    if (!viewedAthleteId) {
      setWorkouts([])
      setLoading(false)
      return
    }

    setLoading(true)
    const q = query(
      collection(db, 'workouts'),
      where('athleteId', '==', viewedAthleteId),
      where('year', '==', currentYear),
      where('week', '==', currentWeek)
    )
    const unsub = onSnapshot(
      q,
      snap => {
        const docs = snap.docs
          .map(d => normalizeWorkout({ id: d.id, ...d.data() }))
          .filter(workout => canManageWorkouts || workout.athleteId === (userProfile?.uid || user?.uid))
          .sort(compareWorkoutsBySchedule)
        setWorkouts(docs)
        setLoading(false)
      },
      () => {
        setWorkouts([])
        setLoading(false)
      }
    )
    return unsub
  }, [canManageWorkouts, currentWeek, currentYear, user?.uid, userProfile?.uid, viewedAthleteId])

  // ─── Home overview workouts listener (always scoped to current user) ───
  useEffect(() => {
    if (!viewedAthleteId) {
      setOverviewWorkouts([])
      setOverviewLoading(false)
      return
    }

    setOverviewLoading(true)
    setOverviewWorkouts([])

    return subscribeToWorkoutWeeks({
      athleteId: viewedAthleteId,
      weeks: overviewWeeks,
      filterWorkout: workout => (
        overviewWeekKeys.has(getWeekKey(workout.week, workout.year))
        && (canManageWorkouts || workout.athleteId === (userProfile?.uid || user?.uid))
      ),
      onData: (nextWorkouts, isReady) => {
        setOverviewWorkouts(nextWorkouts)
        if (isReady) {
          setOverviewLoading(false)
        }
      },
      onError: () => {
        setOverviewLoading(false)
      },
    })
  }, [canManageWorkouts, currentWeek, currentYear, overviewWeekKeys, user?.uid, userProfile?.uid, viewedAthleteId])

  useEffect(() => {
    if (!selectedWorkout) return
    const freshWorkout = workouts.find(w => w.id === selectedWorkout.id)
    if (freshWorkout) {
      setSelectedWorkout(freshWorkout)
      return
    }
    setSelectedWorkout(null)
  }, [workouts, selectedWorkout])

  // ─── Templates listener ───
  useEffect(() => {
    setLoadingTemplates(true)
    if (!userProfile?.uid) {
      setTemplates(mergeTemplates())
      setLoadingTemplates(false)
      return
    }

    const unsub = onSnapshot(
      query(collection(db, 'templates'), where('ownerId', '==', userProfile.uid)),
      snap => {
        const customTemplates = snap.docs.map(d => ({ id: d.id, ...d.data() }))
        setTemplates(mergeTemplates(customTemplates))
        setLoadingTemplates(false)
      }
    )
    return unsub
  }, [userProfile?.uid])

  function prevWeek() {
    const previous = getAdjacentWeek(currentWeek, currentYear, -1)
    setCurrentWeek(previous.week)
    setCurrentYear(previous.year)
  }

  function nextWeek() {
    const next = getAdjacentWeek(currentWeek, currentYear, 1)
    setCurrentWeek(next.week)
    setCurrentYear(next.year)
  }

  function goToToday() {
    setCurrentWeek(getWeekNumber(today))
    setCurrentYear(today.getFullYear())
  }

  function handleWeekChange(week, year) {
    setCurrentWeek(week)
    setCurrentYear(year)
  }

  async function handleLogout() {
    await signOut(auth)
    setShowAdmin(false)
    setShowUserManagement(false)
    setShowAthleteOverview(false)
    setSelectedWorkout(null)
    setReplacementTarget(null)
  }

  async function handleToggleComplete(workout) {
    await updateDoc(doc(db, 'workouts', workout.id), {
      completed: !workout.completed,
      completedAt: !workout.completed ? serverTimestamp() : null,
    })
    if (selectedWorkout?.id === workout.id) {
      setSelectedWorkout(prev => ({ ...prev, completed: !prev.completed }))
    }
  }

  async function handleSaveComment(workout, payload) {
    const userComment = typeof payload === 'string' ? payload : payload.userComment

    await updateDoc(doc(db, 'workouts', workout.id), {
      userComment,
      formScore: deleteField(),
      surplusScore: deleteField(),
      userCommentUpdatedAt: serverTimestamp(),
    })
    if (selectedWorkout?.id === workout.id) {
      setSelectedWorkout(prev => ({
        ...prev,
        userComment,
        formScore: null,
        surplusScore: null,
      }))
    }
  }

  function handleStartReplaceWorkout(workout) {
    setReplacementTarget(workout)
    setSelectedWorkout(null)
  }

  async function handleReplaceWithTemplate(template) {
    if (!replacementTarget) return

    const shouldReplace = window.confirm(
      `Er du sikker på at du vil bytte ut økten "${replacementTarget.title}" med "${template.title}"?`
    )
    if (!shouldReplace) return

    const { id, createdAt, updatedAt, templateId, source, ...fields } = template
    const intensityZone = normalizeIntensityZones(fields.type, fields.intensityZone)
    await updateDoc(doc(db, 'workouts', replacementTarget.id), {
      ...fields,
      intensityZone,
      loadTag: normalizeLoadTag(fields.type, intensityZone, fields.loadTag),
      warmup: fields.warmup?.trim() || getDefaultWarmup(fields.type, fields.activityTag),
      cooldown: fields.cooldown?.trim() || getDefaultCooldown(fields.type, fields.activityTag),
      week: replacementTarget.week,
      year: replacementTarget.year,
      weekday: replacementTarget.weekday,
      date: replacementTarget.date,
      time: replacementTarget.time || '',
      order: replacementTarget.order ?? 0,
      completed: false,
      completedAt: null,
      userComment: '',
      userCommentUpdatedAt: null,
      updatedAt: serverTimestamp(),
    })

    setReplacementTarget(null)
  }

  function closeTemplatePicker() {
    setReplacementTarget(null)
  }

  async function handleWorkoutLayoutChange(nextLayout) {
    const targetUserId = selectedAthleteId || userProfile?.uid
    if (!targetUserId || nextLayout === adminWorkoutLayout) return
    await updateUserProfile(targetUserId, { workoutLayout: nextLayout })
  }

  const { monday, sunday } = getWeekDates(currentWeek, currentYear)
  const doneCount = workouts.filter(w => w.completed).length
  const isThisWeek = currentWeek === getWeekNumber(today) && currentYear === today.getFullYear()
  const workoutDays = groupWorkoutsByWeekday(workouts)
  const overviewByWeekKey = overviewWorkouts.reduce((acc, workout) => {
    const key = getWeekKey(workout.week, workout.year)
    if (!acc[key]) acc[key] = []
    acc[key].push(workout)
    return acc
  }, {})

  // ─── Auth loading state ───
  if (user === undefined || (user && profileLoading)) {
    return (
      <div className="ah-status">
        <div className="ah-status-card">
          <span className="tp-shell-mark" aria-hidden="true">TP</span>
          <h2 className="ah-status-title">Training Planner</h2>
          <p className="ah-status-text">Laster…</p>
        </div>
      </div>
    )
  }

  if (!user) return <Login fullScreen onClose={() => {}} />

  if (profileError) {
    return (
      <div className="ah-status">
        <div className="ah-status-card">
          <span className="tp-shell-mark" aria-hidden="true">TP</span>
          <h2 className="ah-status-title">Training Planner</h2>
          <p className="ah-status-text">{profileError}</p>
          <Button variant="secondary" onClick={handleLogout}>Logg ut</Button>
        </div>
      </div>
    )
  }

  // ─── User Management (superadmin) ───
  if (showUserManagement && isSuperadmin) {
    return (
      <UserManagement
        currentUser={userProfile}
        onClose={() => setShowUserManagement(false)}
      />
    )
  }

  // ─── Athlete Overview (coach/superadmin) ───
  if (showAthleteOverview && canManageWorkouts) {
    return (
      <AthleteOverview
        user={user}
        userProfile={userProfile}
        athletes={athletes}
        onClose={() => setShowAthleteOverview(false)}
      />
    )
  }

  // ─── Admin Dashboard ───
  if (showAdmin && canManageWorkouts) {
    return (
      <AdminDashboard
        user={user}
        userProfile={userProfile}
        onClose={() => setShowAdmin(false)}
        currentWeek={currentWeek}
        currentYear={currentYear}
        onWeekChange={handleWeekChange}
        overviewWeeks={overviewWeeks}
        selectedAthleteId={selectedAthleteId}
        athletes={athletes}
        onSelectAthlete={setSelectedAthleteId}
        workoutLayout={adminWorkoutLayout}
        onWorkoutLayoutChange={handleWorkoutLayoutChange}
        onOpenUserManagement={isSuperadmin ? () => {
          setShowAdmin(false)
          setShowUserManagement(true)
        } : null}
      />
    )
  }

  return (
    <PageShell
      brand={
        <ShellBrand
          eyebrow="Training Planner"
          title={canManageWorkouts && activeHomeAthlete?.displayName ? `Plan: ${activeHomeAthlete.displayName}` : 'Treningsplan'}
        />
      }
      actions={
        <>
          {isSuperadmin && (
            <IconButton ariaLabel="Brukere" onClick={() => setShowUserManagement(true)}>
              <SystemIcon name="users" className="system-icon" />
            </IconButton>
          )}
          {canManageWorkouts && (
            <Button variant="secondary" size="sm" onClick={() => setShowAthleteOverview(true)}>
              <SystemIcon name="users" className="button-icon" />
              Utøvere
            </Button>
          )}
          {canManageWorkouts && (
            <Button variant="secondary" size="sm" onClick={() => setShowAdmin(true)}>
              <SystemIcon name="settings" className="button-icon" />
              Admin
            </Button>
          )}
          <Button variant="ghost" size="sm" onClick={handleLogout}>Logg ut</Button>
        </>
      }
    >
      <Page>
        <WeekNav
          week={currentWeek}
          year={currentYear}
          monday={monday}
          sunday={sunday}
          isThisWeek={isThisWeek}
          onPrev={prevWeek}
          onNext={nextWeek}
          onToday={goToToday}
          rightSlot={
            <IconButton
              ariaLabel="Vis oversikt for siste 4 og neste 4 uker"
              onClick={() => setShowOverview(p => !p)}
              variant={showOverview ? undefined : 'ghost'}
            >
              <span className="ah-overview-glyph" aria-hidden="true"><span /><span /><span /><span /></span>
            </IconButton>
          }
        />

        {canManageWorkouts && athletes.length > 0 && (
          <div className="ah-controls">
            <AthletePicker
              athletes={athletes}
              selectedId={selectedAthleteId}
              onSelect={setSelectedAthleteId}
              currentUserProfile={userProfile}
            />
            <LayoutToggle value={homeWorkoutLayout} onChange={handleWorkoutLayoutChange} />
          </div>
        )}

        {showOverview && (
          overviewLoading ? (
            <Section title="Mengdeoversikt"><div className="ah-loading">Laster…</div></Section>
          ) : (
            <BirdsEyeOverview
              weeks={overviewWeeks}
              workoutsByWeekKey={overviewByWeekKey}
              selectedWeekKey={selectedWeekKey}
              onSelectWeek={(week, year) => { handleWeekChange(week, year); setShowOverview(false) }}
            />
          )
        )}

        {loading ? (
          <EmptyState title="Laster økter…" />
        ) : workouts.length === 0 ? (
          <EmptyState
            icon="•"
            title="Ingen økter denne uken"
            description={canManageWorkouts && activeHomeAthlete?.displayName ? `Ingen økter for ${activeHomeAthlete.displayName}.` : 'Sjekk en annen uke eller spør treneren din.'}
          />
        ) : (
          <>
            <Section padded>
              <div className="ah-summary">
                <div className="ah-summary-text">
                  <span className="tp-num">{doneCount}/{workouts.length}</span> fullført
                </div>
                <div className="ah-progress" aria-hidden="true">
                  <div className="ah-progress-fill" style={{ width: `${(doneCount / workouts.length) * 100}%` }} />
                </div>
              </div>
            </Section>

            {homeWorkoutLayout === 'calendar' ? (
              <div className="ah-day-list">
                {workoutDays.map(day => (
                  <Section
                    key={day.value}
                    title={day.label}
                    subtitle={day.workouts.length > 0 ? `${day.workouts.length} økt${day.workouts.length > 1 ? 'er' : ''}` : 'Hvile / ingen økter'}
                  >
                    {day.workouts.length === 0 ? (
                      <div className="ah-empty-slot">Ledig slot</div>
                    ) : (
                      <div className="ah-day-stack">
                        {day.workouts.map(workout => (
                          <WorkoutCard
                            key={workout.id}
                            workout={workout}
                            onClick={() => setSelectedWorkout(workout)}
                            onToggleComplete={() => handleToggleComplete(workout)}
                          />
                        ))}
                      </div>
                    )}
                  </Section>
                ))}
              </div>
            ) : (
              <div className="ah-day-stack">
                {workouts.map(workout => (
                  <WorkoutCard
                    key={workout.id}
                    workout={workout}
                    onClick={() => setSelectedWorkout(workout)}
                    onToggleComplete={() => handleToggleComplete(workout)}
                    showSchedule={false}
                  />
                ))}
              </div>
            )}
          </>
        )}
      </Page>

      {selectedWorkout && (
        <WorkoutDetail
          workout={selectedWorkout}
          onClose={() => setSelectedWorkout(null)}
          canEdit={canManageWorkouts}
          onReplace={canManageWorkouts ? handleStartReplaceWorkout : undefined}
          onDelete={canManageWorkouts ? async (w) => {
            await deleteDoc(doc(db, 'workouts', w.id))
            setSelectedWorkout(null)
          } : undefined}
          onToggleComplete={handleToggleComplete}
          onSaveComment={handleSaveComment}
          onEdit={canManageWorkouts ? async (updated) => {
            const { id, ...fields } = updated
            const intensityZone = normalizeIntensityZones(fields.type, fields.intensityZone)
            await updateDoc(doc(db, 'workouts', id), {
              ...fields,
              weekday: Number(fields.weekday),
              date: getDateStringForWeekday(updated.week, updated.year, fields.weekday),
              intensityZone,
              loadTag: normalizeLoadTag(fields.type, intensityZone, fields.loadTag),
              warmup: fields.warmup?.trim() || getDefaultWarmup(fields.type, fields.activityTag),
              cooldown: fields.cooldown?.trim() || getDefaultCooldown(fields.type, fields.activityTag),
            })
            setSelectedWorkout(null)
          } : undefined}
        />
      )}

      {replacementTarget && (
        <TemplatePickerModal
          targetWorkout={replacementTarget}
          templates={templates}
          loading={loadingTemplates}
          onClose={closeTemplatePicker}
          onPick={handleReplaceWithTemplate}
        />
      )}

      {showLogin && <Login onClose={() => setShowLogin(false)} />}
    </PageShell>
  )
}

function TemplatePickerModal({ targetWorkout, templates, loading, onClose, onPick }) {
  return (
    <Modal
      open
      onClose={onClose}
      eyebrow="Bytt økt"
      title={`Erstatt «${targetWorkout.title}»`}
      size="lg"
    >
      {loading ? (
        <EmptyState title="Laster øktbank…" />
      ) : templates.length === 0 ? (
        <EmptyState title="Tom øktbank" description="Du har ingen økter i banken ennå." />
      ) : (
        <div className="ah-template-grid">
          {templates.map(template => (
            <TemplateCard
              key={template.id}
              template={template}
              primaryLabel="Bytt til denne"
              onPrimary={() => onPick(template)}
            />
          ))}
        </div>
      )}
    </Modal>
  )
}
