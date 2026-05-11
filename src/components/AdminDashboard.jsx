import { useEffect, useMemo, useState } from 'react'
import {
  collection, query, where, onSnapshot,
  addDoc, updateDoc, deleteDoc, doc, serverTimestamp, writeBatch, deleteField
} from 'firebase/firestore'
import { signOut } from 'firebase/auth'
import { db, auth } from '../firebase'
import {
  getWeekNumber,
  getAdjacentWeek,
  getWeekDates,
  getWeekKey,
  getWeekWindow,
  ZONE_COLORS,
  TYPE_COLORS,
  TYPE_ICONS,
  TEMPLATE_CATEGORIES,
  ACTIVITY_TAGS,
  ACTIVITY_TAG_MAP,
  LOAD_TAG_MAP,
  compareWorkoutsBySchedule,
  formatWorkoutTime,
  formatWorkoutSchedule,
  getDateStringForWeekday,
  getDefaultCooldown,
  getDefaultIntensityZones,
  getDefaultLoadTag,
  getDefaultWarmup,
  getIntensityZoneLabel,
  groupWorkoutsByWeekday,
  normalizeLoadTag,
  normalizeIntensityZones,
  normalizeIntensityZone,
  normalizeWorkout,
} from '../utils'
import { sortTemplates } from '../templateLibrary'
import WorkoutForm from './WorkoutForm'
import WorkoutDetail from './WorkoutDetail'
import BirdsEyeOverview from './BirdsEyeOverview'
import AnalysisDashboard from './AnalysisDashboard'
import AthleteSelector from './AthleteSelector'
import ActivityIcon from './ActivityIcon'
import SystemIcon from './SystemIcon'
import WorkoutLayoutToggle from './WorkoutLayoutToggle'
import AdminPlanBuilder from './AdminPlanBuilder'
import TestingDashboard from './TestingDashboard'
import LibraryBrowser from './LibraryBrowser'
import {
  Button,
  IconButton,
  PageShell,
  ShellBrand,
  Page,
  PageHeader,
  Section,
  EmptyState,
  Toolbar,
  ToolbarGroup,
  SearchBox,
  Chip,
  SportPicker,
  WeekNav,
  LayoutToggle,
  TemplateCard as UITemplateCard,
  Modal,
} from './ui'
import './LibraryBrowser.css'
import './AdminPlanBuilder.css'
import { subscribeToWorkoutWeeks } from '../workoutSubscriptions'

// ─── Helpers ───────────────────────────────────────────────────────────────

const EMPTY_TEMPLATE = {
  category: 'Intervall',
  type: 'interval',
  title: '',
  description: '',
  distance: '',
  sessionDetails: '',
  warmup: getDefaultWarmup('interval'),
  cooldown: getDefaultCooldown('interval'),
  exercises: '',
  rest: '',
  notes: '',
  intensityZone: getDefaultIntensityZones('interval'),
  loadTag: getDefaultLoadTag('interval', getDefaultIntensityZones('interval')),
  activityTag: '',
  weekday: '',
  time: '',
}

// ─── Main Component ────────────────────────────────────────────────────────

export default function AdminDashboard({
  user,
  userProfile,
  onClose,
  currentWeek,
  currentYear,
  onWeekChange,
  overviewWeeks,
  selectedAthleteId,
  athletes,
  onSelectAthlete,
  onOpenUserManagement,
  workoutLayout,
  onWorkoutLayoutChange,
}) {
  const today = new Date()
  const [tab, setTab] = useState('plan')

  // Ukeplan state
  const [workouts, setWorkouts] = useState([])
  const [loadingWorkouts, setLoadingWorkouts] = useState(true)
  const [selectedWorkout, setSelectedWorkout] = useState(null)
  const [showCustomForm, setShowCustomForm] = useState(false)
  const [customForm, setCustomForm] = useState({ ...EMPTY_TEMPLATE })
  const [replacementTarget, setReplacementTarget] = useState(null)
  const [analysisWorkouts, setAnalysisWorkouts] = useState([])
  const [loadingAnalysis, setLoadingAnalysis] = useState(true)
  const [overviewWorkouts, setOverviewWorkouts] = useState([])
  const [loadingOverview, setLoadingOverview] = useState(true)

  // Øktbank state
  const [templates, setTemplates] = useState([])
  const [loadingTemplates, setLoadingTemplates] = useState(true)
  const [globalTemplates, setGlobalTemplates] = useState([])
  const [loadingGlobalTemplates, setLoadingGlobalTemplates] = useState(true)
  const [activeCategory, setActiveCategory] = useState('Alle')
  const [editingTemplate, setEditingTemplate] = useState(null)
  const [templateForm, setTemplateForm] = useState({ ...EMPTY_TEMPLATE })
  const [editingGlobalTemplate, setEditingGlobalTemplate] = useState(null)
  const [globalTemplateForm, setGlobalTemplateForm] = useState({ ...EMPTY_TEMPLATE })
  const [pickingFromBank, setPickingFromBank] = useState(false)
  const [showOverview, setShowOverview] = useState(false)
  const [activeTagFilter, setActiveTagFilter] = useState(null)
  const [draggedWorkoutId, setDraggedWorkoutId] = useState(null)
  const [dropTarget, setDropTarget] = useState(null)

  const { monday, sunday } = getWeekDates(currentWeek, currentYear)
  const analysisWeeks = useMemo(() => getWeekWindow(currentWeek, currentYear, 11, 11), [currentWeek, currentYear])
  const analysisWeekKeys = useMemo(() => new Set(analysisWeeks.map(week => week.key)), [analysisWeeks])
  const overviewWeekKeys = useMemo(() => new Set(overviewWeeks.map(week => week.key)), [overviewWeeks])
  const isThisWeek = currentWeek === getWeekNumber(today) && currentYear === today.getFullYear()
  const isSuperadmin = userProfile?.role === 'superadmin'

  // ─── Workouts listener (scoped to selected athlete) ───
  useEffect(() => {
    if (!selectedAthleteId) {
      setWorkouts([])
      setLoadingWorkouts(false)
      return
    }

    setLoadingWorkouts(true)
    const q = query(
      collection(db, 'workouts'),
      where('athleteId', '==', selectedAthleteId),
      where('year', '==', currentYear),
      where('week', '==', currentWeek)
    )
    const unsub = onSnapshot(
      q,
      snap => {
        const docs = snap.docs
          .map(d => normalizeWorkout({ id: d.id, ...d.data() }))
          .sort(compareWorkoutsBySchedule)
        setWorkouts(docs)
        setLoadingWorkouts(false)
      },
      () => {
        setWorkouts([])
        setLoadingWorkouts(false)
      }
    )
    return unsub
  }, [currentWeek, currentYear, selectedAthleteId])

  useEffect(() => {
    if (!selectedWorkout) return
    const freshWorkout = workouts.find(w => w.id === selectedWorkout.id)
    if (freshWorkout) {
      setSelectedWorkout(freshWorkout)
      return
    }
    setSelectedWorkout(null)
  }, [workouts, selectedWorkout])

  useEffect(() => {
    if (!selectedAthleteId) {
      setOverviewWorkouts([])
      setLoadingOverview(false)
      return
    }

    setLoadingOverview(true)
    setOverviewWorkouts([])

    return subscribeToWorkoutWeeks({
      athleteId: selectedAthleteId,
      weeks: overviewWeeks,
      filterWorkout: workout => overviewWeekKeys.has(getWeekKey(workout.week, workout.year)),
      onData: (nextWorkouts, isReady) => {
        setOverviewWorkouts(nextWorkouts)
        if (isReady) {
          setLoadingOverview(false)
        }
      },
      onError: () => {
        setLoadingOverview(false)
      },
    })
  }, [overviewWeekKeys, overviewWeeks, selectedAthleteId])

  useEffect(() => {
    if (!selectedAthleteId) {
      setAnalysisWorkouts([])
      setLoadingAnalysis(false)
      return
    }

    setLoadingAnalysis(true)
    return subscribeToWorkoutWeeks({
      athleteId: selectedAthleteId,
      weeks: analysisWeeks,
      filterWorkout: workout => analysisWeekKeys.has(getWeekKey(workout.week, workout.year)),
      onData: (nextWorkouts, isReady) => {
        setAnalysisWorkouts(nextWorkouts)
        if (isReady) {
          setLoadingAnalysis(false)
        }
      },
      onError: () => {
        setLoadingAnalysis(false)
      },
    })
  }, [analysisWeekKeys, analysisWeeks, selectedAthleteId])

  // ─── Coach's own templates listener (custom-only) ───
  useEffect(() => {
    setLoadingTemplates(true)
    if (!userProfile?.uid) {
      setTemplates([])
      setLoadingTemplates(false)
      return
    }

    const unsub = onSnapshot(
      query(collection(db, 'templates'), where('ownerId', '==', userProfile.uid)),
      snap => {
        const customTemplates = snap.docs
          .map(d => normalizeWorkout({ id: d.id, ...d.data() }))
          .sort(sortTemplates)
        setTemplates(customTemplates)
        setLoadingTemplates(false)
      }
    )
    return unsub
  }, [userProfile?.uid])

  // ─── Global session library listener ───
  useEffect(() => {
    setLoadingGlobalTemplates(true)
    if (!userProfile?.uid) {
      setGlobalTemplates([])
      setLoadingGlobalTemplates(false)
      return
    }

    const unsub = onSnapshot(
      collection(db, 'globalTemplates'),
      snap => {
        const items = snap.docs
          .map(d => normalizeWorkout({ id: d.id, ...d.data(), source: 'global' }))
          .sort(sortTemplates)
        setGlobalTemplates(items)
        setLoadingGlobalTemplates(false)
      },
      () => {
        setGlobalTemplates([])
        setLoadingGlobalTemplates(false)
      }
    )
    return unsub
  }, [userProfile?.uid])

  // ─── Week nav ───
  function prevWeek() {
    const previous = getAdjacentWeek(currentWeek, currentYear, -1)
    onWeekChange(previous.week, previous.year)
  }
  function nextWeek() {
    const next = getAdjacentWeek(currentWeek, currentYear, 1)
    onWeekChange(next.week, next.year)
  }

  // ─── Workout actions ───
  async function addWorkoutToWeek(fields) {
    if (!selectedAthleteId) return
    const nextOrder = workouts.length > 0 ? Math.max(...workouts.map(w => w.order ?? 0)) + 1 : 1
    const weekday = Number(fields.weekday)
    const intensityZone = normalizeIntensityZones(fields.type, fields.intensityZone)
    await addDoc(collection(db, 'workouts'), {
      ...fields,
      intensityZone,
      loadTag: normalizeLoadTag(fields.type, intensityZone, fields.loadTag),
      warmup: fields.warmup?.trim() || getDefaultWarmup(fields.type, fields.activityTag),
      cooldown: fields.cooldown?.trim() || getDefaultCooldown(fields.type, fields.activityTag),
      athleteId: selectedAthleteId,
      week: currentWeek,
      year: currentYear,
      weekday,
      date: getDateStringForWeekday(currentWeek, currentYear, weekday),
      order: nextOrder,
      completed: false,
      createdAt: serverTimestamp(),
    })
  }

  async function handleAddCustom(e) {
    e.preventDefault()
    await addWorkoutToWeek(customForm)
    setShowCustomForm(false)
    setCustomForm({ ...EMPTY_TEMPLATE })
  }

  async function handleAddFromTemplate(template) {
    const { id, createdAt, ...fields } = template
    if (replacementTarget) {
      const shouldReplace = window.confirm(
        `Er du sikker på at du vil bytte ut økten "${replacementTarget.title}" med "${template.title}"?`
      )
      if (!shouldReplace) return

      await updateDoc(doc(db, 'workouts', replacementTarget.id), {
        ...EMPTY_TEMPLATE,
        ...fields,
        intensityZone: normalizeIntensityZones(fields.type, fields.intensityZone),
        loadTag: normalizeLoadTag(fields.type, fields.intensityZone, fields.loadTag),
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
      })

      if (selectedWorkout?.id === replacementTarget.id) {
        setSelectedWorkout(null)
      }
      setReplacementTarget(null)
    } else {
      setCustomForm({
        ...EMPTY_TEMPLATE,
        ...fields,
        weekday: customForm.weekday || '',
        time: fields.time || '',
      })
      setShowCustomForm(true)
    }

    setPickingFromBank(false)
    setTab('plan')
  }

  async function handleAddTemplateToDay(template, weekday, beforeWorkoutId = null) {
    if (!selectedAthleteId) return

    const normalizedWeekday = Number(weekday)
    const targetDayWorkouts = workouts
      .filter(workout => workout.weekday === normalizedWeekday)
      .sort(compareWorkoutsBySchedule)

    let insertIndex = targetDayWorkouts.length
    if (beforeWorkoutId) {
      const candidateIndex = targetDayWorkouts.findIndex(workout => workout.id === beforeWorkoutId)
      if (candidateIndex >= 0) {
        insertIndex = candidateIndex
      }
    }

    const { id, createdAt, updatedAt, ownerId, source, ...fields } = template
    const batch = writeBatch(db)
    const newWorkoutRef = doc(collection(db, 'workouts'))

    batch.set(newWorkoutRef, {
      ...EMPTY_TEMPLATE,
      ...fields,
      intensityZone: normalizeIntensityZones(fields.type, fields.intensityZone),
      loadTag: normalizeLoadTag(fields.type, fields.intensityZone, fields.loadTag),
      warmup: fields.warmup?.trim() || getDefaultWarmup(fields.type, fields.activityTag),
      cooldown: fields.cooldown?.trim() || getDefaultCooldown(fields.type, fields.activityTag),
      athleteId: selectedAthleteId,
      week: currentWeek,
      year: currentYear,
      weekday: normalizedWeekday,
      date: getDateStringForWeekday(currentWeek, currentYear, normalizedWeekday),
      time: fields.time || '',
      completed: false,
      completedAt: null,
      userComment: '',
      userCommentUpdatedAt: null,
      createdAt: serverTimestamp(),
      order: insertIndex + 1,
    })

    const nextTargetDayWorkouts = [...targetDayWorkouts]
    nextTargetDayWorkouts.splice(insertIndex, 0, {
      id: newWorkoutRef.id,
      ...fields,
      weekday: normalizedWeekday,
    })

    nextTargetDayWorkouts.forEach((workout, index) => {
      if (workout.id === newWorkoutRef.id) {
        batch.set(newWorkoutRef, { order: index + 1 }, { merge: true })
        return
      }

      batch.update(doc(db, 'workouts', workout.id), {
        order: index + 1,
      })
    })

    await batch.commit()
  }

  function handleStartReplaceWorkout(workout) {
    setReplacementTarget(workout)
    setPickingFromBank(true)
    setTab('oktbank')
  }

  function handleOpenWorkoutBank() {
    setReplacementTarget(null)
    setPickingFromBank(true)
    setTab('oktbank')
  }

  async function handleEditWorkout(updated) {
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
  }

  async function handleDeleteWorkout(workout) {
    if (!window.confirm(`Slett "${workout.title}"?`)) return
    await deleteDoc(doc(db, 'workouts', workout.id))
    setSelectedWorkout(null)
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

  async function moveWorkout(workout, direction) {
    const sorted = workouts
      .filter(item => item.weekday === workout.weekday)
      .sort(compareWorkoutsBySchedule)
    const idx = sorted.findIndex(w => w.id === workout.id)
    const swapIdx = idx + direction
    if (swapIdx < 0 || swapIdx >= sorted.length) return
    const batch = writeBatch(db)
    batch.update(doc(db, 'workouts', sorted[idx].id), { order: sorted[swapIdx].order ?? swapIdx + 1 })
    batch.update(doc(db, 'workouts', sorted[swapIdx].id), { order: sorted[idx].order ?? idx + 1 })
    await batch.commit()
  }

  async function moveWorkoutByDrag(workoutId, targetWeekday, beforeWorkoutId = null) {
    const draggedWorkout = workouts.find(workout => workout.id === workoutId)
    if (!draggedWorkout || !targetWeekday) return

    const normalizedTargetWeekday = Number(targetWeekday)
    const sourceWeekday = Number(draggedWorkout.weekday)
    const sourceDayWorkouts = workouts
      .filter(workout => workout.weekday === sourceWeekday && workout.id !== draggedWorkout.id)
      .sort(compareWorkoutsBySchedule)
    const targetDayWorkouts = workouts
      .filter(workout => workout.weekday === normalizedTargetWeekday && workout.id !== draggedWorkout.id)
      .sort(compareWorkoutsBySchedule)

    let insertIndex = targetDayWorkouts.length
    if (beforeWorkoutId) {
      const candidateIndex = targetDayWorkouts.findIndex(workout => workout.id === beforeWorkoutId)
      if (candidateIndex >= 0) {
        insertIndex = candidateIndex
      }
    }

    const nextTargetDayWorkouts = [...targetDayWorkouts]
    nextTargetDayWorkouts.splice(insertIndex, 0, {
      ...draggedWorkout,
      weekday: normalizedTargetWeekday,
      date: getDateStringForWeekday(currentWeek, currentYear, normalizedTargetWeekday),
    })

    const nextTargetIds = nextTargetDayWorkouts.map(workout => workout.id)
    const currentTargetIds = workouts
      .filter(workout => workout.weekday === normalizedTargetWeekday)
      .sort(compareWorkoutsBySchedule)
      .map(workout => workout.id)

    if (
      sourceWeekday === normalizedTargetWeekday &&
      nextTargetIds.join('|') === currentTargetIds.join('|')
    ) {
      return
    }

    const batch = writeBatch(db)

    nextTargetDayWorkouts.forEach((workout, index) => {
      batch.update(doc(db, 'workouts', workout.id), {
        weekday: normalizedTargetWeekday,
        date: getDateStringForWeekday(currentWeek, currentYear, normalizedTargetWeekday),
        order: index + 1,
      })
    })

    if (sourceWeekday !== normalizedTargetWeekday) {
      sourceDayWorkouts.forEach((workout, index) => {
        batch.update(doc(db, 'workouts', workout.id), {
          order: index + 1,
        })
      })
    }

    await batch.commit()
  }

  function handleDragStart(workout) {
    setDraggedWorkoutId(workout.id)
    setDropTarget({
      weekday: workout.weekday,
      beforeWorkoutId: workout.id,
    })
  }

  function handleDragEnd() {
    setDraggedWorkoutId(null)
    setDropTarget(null)
  }

  function handleDropTargetChange(weekday, beforeWorkoutId = null) {
    if (!draggedWorkoutId) return

    setDropTarget(prev => {
      if (prev?.weekday === weekday && prev?.beforeWorkoutId === beforeWorkoutId) {
        return prev
      }
      return { weekday, beforeWorkoutId }
    })
  }

  async function handleDropWorkout(weekday, beforeWorkoutId = null) {
    if (!draggedWorkoutId) return

    const draggedId = draggedWorkoutId
    setDraggedWorkoutId(null)
    setDropTarget(null)
    await moveWorkoutByDrag(draggedId, weekday, beforeWorkoutId)
  }

  // ─── Template actions ───
  function startNewTemplate() {
    setTemplateForm({ ...EMPTY_TEMPLATE })
    setEditingTemplate('new')
  }

  function startEditTemplate(template) {
    setTemplateForm({ ...template })
    setEditingTemplate(template)
  }

  async function handleSaveTemplate(e) {
    e.preventDefault()
    if (!templateForm.title.trim()) return
    if (editingTemplate === 'new') {
      await addDoc(collection(db, 'templates'), {
        ...templateForm,
        source: 'custom',
        ownerId: userProfile.uid,
        intensityZone: normalizeIntensityZones(templateForm.type, templateForm.intensityZone),
        loadTag: normalizeLoadTag(templateForm.type, templateForm.intensityZone, templateForm.loadTag),
        warmup: templateForm.warmup?.trim() || getDefaultWarmup(templateForm.type, templateForm.activityTag),
        cooldown: templateForm.cooldown?.trim() || getDefaultCooldown(templateForm.type, templateForm.activityTag),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      })
    } else {
      const { id, ...fields } = templateForm
      await updateDoc(doc(db, 'templates', editingTemplate.id), {
        ...fields,
        intensityZone: normalizeIntensityZones(fields.type, fields.intensityZone),
        loadTag: normalizeLoadTag(fields.type, fields.intensityZone, fields.loadTag),
        warmup: fields.warmup?.trim() || getDefaultWarmup(fields.type, fields.activityTag),
        cooldown: fields.cooldown?.trim() || getDefaultCooldown(fields.type, fields.activityTag),
        updatedAt: serverTimestamp(),
      })
    }
    setEditingTemplate(null)
  }

  async function handleDeleteTemplate(template) {
    if (!window.confirm(`Slett malen "${template.title}"?`)) return
    await deleteDoc(doc(db, 'templates', template.id))
  }

  // ─── Global library actions ───
  async function handleAddFromLibrary(template) {
    if (!userProfile?.uid) return
    const { id, source, createdAt, updatedAt, ownerId, libraryId, ...fields } = template
    await addDoc(collection(db, 'templates'), {
      ...fields,
      source: 'custom',
      ownerId: userProfile.uid,
      libraryId: id,
      intensityZone: normalizeIntensityZones(fields.type, fields.intensityZone),
      loadTag: normalizeLoadTag(fields.type, fields.intensityZone, fields.loadTag),
      warmup: fields.warmup?.trim() || getDefaultWarmup(fields.type, fields.activityTag),
      cooldown: fields.cooldown?.trim() || getDefaultCooldown(fields.type, fields.activityTag),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    })
  }

  function isAlreadyInBank(template) {
    return templates.some(t => t.libraryId === template.id)
  }

  async function handleDeleteGlobalTemplate(template) {
    if (!isSuperadmin) return
    if (!window.confirm(`Slett "${template.title}" fra biblioteket? Coachers kopier beholdes.`)) return
    await deleteDoc(doc(db, 'globalTemplates', template.id))
  }

  function startEditGlobalTemplate(template) {
    if (!isSuperadmin) return
    setEditingGlobalTemplate(template)
    setGlobalTemplateForm({ ...template })
  }

  function startNewGlobalTemplate() {
    if (!isSuperadmin) return
    setEditingGlobalTemplate('new')
    setGlobalTemplateForm({ ...EMPTY_TEMPLATE })
  }

  async function handleSaveGlobalTemplate(e) {
    e.preventDefault()
    if (!isSuperadmin) return
    if (!globalTemplateForm.title?.trim()) return

    const fields = {
      ...globalTemplateForm,
      intensityZone: normalizeIntensityZones(globalTemplateForm.type, globalTemplateForm.intensityZone),
      loadTag: normalizeLoadTag(globalTemplateForm.type, globalTemplateForm.intensityZone, globalTemplateForm.loadTag),
      warmup: globalTemplateForm.warmup?.trim() || getDefaultWarmup(globalTemplateForm.type, globalTemplateForm.activityTag),
      cooldown: globalTemplateForm.cooldown?.trim() || getDefaultCooldown(globalTemplateForm.type, globalTemplateForm.activityTag),
      updatedAt: serverTimestamp(),
    }

    if (editingGlobalTemplate === 'new') {
      await addDoc(collection(db, 'globalTemplates'), {
        ...fields,
        source: 'global',
        createdAt: serverTimestamp(),
      })
    } else {
      const { id, ...rest } = fields
      await updateDoc(doc(db, 'globalTemplates', editingGlobalTemplate.id), rest)
    }
    setEditingGlobalTemplate(null)
  }

  async function handleLogout() {
    await signOut(auth)
    onClose()
  }

  const filteredTemplates = activeCategory === 'Alle'
    ? templates
    : templates.filter(t => t.category === activeCategory)
  const selectedWeekKey = getWeekKey(currentWeek, currentYear)
  const filteredWorkouts = workouts
    .filter(workout => !activeTagFilter || workout.activityTag === activeTagFilter)
    .sort(compareWorkoutsBySchedule)
  const groupedWorkouts = groupWorkoutsByWeekday(filteredWorkouts)
  const overviewWorkoutsByWeekKey = overviewWorkouts.reduce((acc, workout) => {
    const key = getWeekKey(workout.week, workout.year)
    if (!acc[key]) acc[key] = []
    acc[key].push(workout)
    return acc
  }, {})
  const analysisWorkoutsByWeekKey = analysisWorkouts.reduce((acc, workout) => {
    const key = getWeekKey(workout.week, workout.year)
    if (!acc[key]) acc[key] = []
    acc[key].push(workout)
    return acc
  }, {})

  // Get selected athlete name for display
  const selectedAthleteName = athletes.find(a => a.uid === selectedAthleteId)?.displayName
    || (selectedAthleteId === userProfile?.uid ? userProfile?.displayName : null)

  // ─── Render: Custom workout form ───
  if (showCustomForm) {
    return (
      <PageShell brand={<ShellBrand onBack={() => setShowCustomForm(false)} eyebrow="Ny økt" title="Egendefinert økt" />}>
        <Page>
          <form onSubmit={handleAddCustom} className="tp-form">
            <WorkoutForm value={customForm} onChange={setCustomForm} showScheduleFields />
            <div className="tp-form-actions">
              <Button variant="secondary" type="button" onClick={() => setShowCustomForm(false)}>Avbryt</Button>
              <Button type="submit">Legg til i uke {currentWeek}</Button>
            </div>
          </form>
        </Page>
      </PageShell>
    )
  }

  function changeTab(next) {
    setTab(next)
    setReplacementTarget(null)
    if (next !== 'oktbank') setPickingFromBank(false)
  }

  const tabItems = [
    { value: 'plan',     label: 'Ukeplan' },
    { value: 'oktbank',  label: 'Øktbank' },
    { value: 'library',  label: 'Bibliotek' },
    { value: 'builder',  label: 'Planverktøy' },
    { value: 'analysis', label: 'Analyse' },
    { value: 'tests',    label: 'Tester' },
  ]

  return (
    <PageShell
      className={tab === 'builder' ? 'admin-dashboard-wide' : undefined}
      brand={<ShellBrand onBack={onClose} eyebrow="Training Planner" title={isSuperadmin ? 'Adminpanel' : 'Trenerpanel'} />}
      actions={
        <>
          {onOpenUserManagement && (
            <Button variant="secondary" size="sm" onClick={onOpenUserManagement}>
              <SystemIcon name="users" className="button-icon" />
              Brukere
            </Button>
          )}
          <Button variant="ghost" size="sm" onClick={handleLogout}>Logg ut</Button>
        </>
      }
      banner={athletes.length > 0 ? (
        <>
          <div className="tp-shell-selector-meta">
            <span className="tp-shell-selector-label">Utøver</span>
          </div>
          <AthleteSelector
            athletes={athletes}
            selectedAthleteId={selectedAthleteId}
            onSelect={onSelectAthlete}
            currentUserProfile={userProfile}
            hideLabel
          />
        </>
      ) : null}
      tabs={tabItems}
      tabValue={tab}
      onTabChange={changeTab}
    >

      {!selectedAthleteId && (tab === 'plan' || tab === 'builder') && (
        <Page>
          <EmptyState
            title="Ingen utøver valgt"
            description={tab === 'plan' ? 'Velg en utøver for å administrere treningsplanen.' : 'Velg en utøver for å bruke planverktøyet.'}
          />
        </Page>
      )}

      {/* ─── Ukeplan tab ─── */}
      {tab === 'plan' && selectedAthleteId && (
        <Page>
          {selectedAthleteName && (
            <div className="pb-athlete-banner">
              Treningsplan for <strong>{selectedAthleteName}</strong>
            </div>
          )}

          <WeekNav
            week={currentWeek}
            year={currentYear}
            monday={monday}
            sunday={sunday}
            isThisWeek={isThisWeek}
            onPrev={prevWeek}
            onNext={nextWeek}
            onToday={() => onWeekChange(getWeekNumber(new Date()), new Date().getFullYear())}
            rightSlot={
              <IconButton
                ariaLabel="Vis ukeoversikt"
                variant={showOverview ? undefined : 'ghost'}
                onClick={() => setShowOverview(p => !p)}
              >
                <span className="pb-overview-glyph" aria-hidden="true"><span /><span /><span /><span /></span>
              </IconButton>
            }
          />

          {showOverview && (
            loadingOverview ? (
              <div className="pb-overview-loading" id="admin-birds-eye-overview">Laster mengdeoversikt…</div>
            ) : (
              <div className="pb-overview-wrap" id="admin-birds-eye-overview">
                <BirdsEyeOverview
                  weeks={overviewWeeks}
                  workoutsByWeekKey={overviewWorkoutsByWeekKey}
                  selectedWeekKey={selectedWeekKey}
                  onSelectWeek={(week, year) => {
                    onWeekChange(week, year)
                    setShowOverview(false)
                  }}
                />
              </div>
            )
          )}

          <Toolbar>
            <ToolbarGroup label="Visning">
              <LayoutToggle value={workoutLayout} onChange={onWorkoutLayoutChange} />
            </ToolbarGroup>
            <ToolbarGroup label="Aktivitet">
              <SportPicker
                value={activeTagFilter ? [activeTagFilter] : []}
                onChange={(next) => setActiveTagFilter(next.length ? next[next.length - 1] : null)}
                limitToValues={Array.from(new Set(workouts.map(w => w.activityTag).filter(Boolean)))}
              />
            </ToolbarGroup>
          </Toolbar>

          <div className="pb-plan-list">
            {loadingWorkouts ? (
              <EmptyState title="Laster…" />
            ) : filteredWorkouts.length === 0 ? (
              <EmptyState
                title={activeTagFilter ? 'Ingen økter matcher valgt aktivitet' : 'Ingen økter denne uken'}
                description={activeTagFilter ? 'Prøv å fjerne aktivitetsfilteret.' : 'Legg til en økt fra øktbanken eller opprett en ny.'}
              />
            ) : workoutLayout === 'calendar' ? (
              groupedWorkouts.map(day => (
                <section key={day.value} className="pb-day">
                  <header className="pb-day-head">
                    <div className="pb-day-titles">
                      <h2 className="pb-day-title">{day.label}</h2>
                      <div className="pb-day-meta">
                        {day.workouts.length > 0 ? `${day.workouts.length} økt${day.workouts.length > 1 ? 'er' : ''}` : 'Ingen økter'}
                      </div>
                    </div>
                    <div className="pb-day-actions">
                      <button
                        type="button"
                        className="pb-mini-btn"
                        onClick={() => {
                          setReplacementTarget(null)
                          setCustomForm(prev => ({ ...prev, weekday: day.value }))
                          setPickingFromBank(true)
                          setTab('oktbank')
                        }}
                      >
                        Fra øktbank
                      </button>
                      <button
                        type="button"
                        className="pb-mini-btn pb-mini-btn--solid"
                        onClick={() => {
                          setCustomForm({ ...EMPTY_TEMPLATE, weekday: day.value })
                          setShowCustomForm(true)
                        }}
                      >
                        Ny økt
                      </button>
                    </div>
                  </header>

                  {day.workouts.length === 0 ? (
                    <div className="pb-day-slots">
                      <div className="pb-empty-slot">Ledig slot</div>
                    </div>
                  ) : (
                    <div className="pb-day-slots">
                      {day.workouts.map((workout, idx) => (
                        <AdminWorkoutSlot
                          key={workout.id}
                          workout={workout}
                          index={idx}
                          total={day.workouts.length}
                          onClick={setSelectedWorkout}
                          onDelete={handleDeleteWorkout}
                          onReplace={handleStartReplaceWorkout}
                          onToggleComplete={handleToggleComplete}
                          onMoveUp={() => moveWorkout(workout, -1)}
                          onMoveDown={() => moveWorkout(workout, 1)}
                          isDragging={draggedWorkoutId === workout.id}
                          isDropTarget={dropTarget?.beforeWorkoutId === workout.id}
                          onDragStart={() => handleDragStart(workout)}
                          onDragEnd={handleDragEnd}
                          onDragOver={e => {
                            e.preventDefault()
                            e.stopPropagation()
                            handleDropTargetChange(day.value, workout.id)
                          }}
                          onDrop={async e => {
                            e.preventDefault()
                            e.stopPropagation()
                            await handleDropWorkout(day.value, workout.id)
                          }}
                        />
                      ))}
                    </div>
                  )}

                  <div
                    className={`pb-day-dropzone${
                      dropTarget?.weekday === day.value && !dropTarget?.beforeWorkoutId ? ' is-target' : ''
                    }`}
                    onDragOver={e => {
                      e.preventDefault()
                      handleDropTargetChange(day.value)
                    }}
                    onDrop={async e => {
                      e.preventDefault()
                      await handleDropWorkout(day.value)
                    }}
                  >
                    Slipp her for å legge økten sist denne dagen
                  </div>
                </section>
              ))
            ) : (
              <div className="pb-workout-list">
                {filteredWorkouts.map((workout, index) => (
                  <AdminWorkoutSlot
                    key={workout.id}
                    workout={workout}
                    index={index}
                    total={filteredWorkouts.length}
                    onClick={setSelectedWorkout}
                    onDelete={handleDeleteWorkout}
                    onReplace={handleStartReplaceWorkout}
                    onToggleComplete={handleToggleComplete}
                    onMoveUp={() => moveWorkout(workout, -1)}
                    onMoveDown={() => moveWorkout(workout, 1)}
                    isDragging={draggedWorkoutId === workout.id}
                    isDropTarget={dropTarget?.beforeWorkoutId === workout.id}
                    onDragStart={() => handleDragStart(workout)}
                    onDragEnd={handleDragEnd}
                    onDragOver={e => {
                      e.preventDefault()
                      e.stopPropagation()
                      handleDropTargetChange(workout.weekday, workout.id)
                    }}
                    onDrop={async e => {
                      e.preventDefault()
                      e.stopPropagation()
                      await handleDropWorkout(workout.weekday, workout.id)
                    }}
                  />
                ))}
              </div>
            )}
          </div>
        </Page>
      )}

      {tab === 'analysis' && (
        <>
          {!selectedAthleteId ? (
            <Page>
              <EmptyState title="Ingen utøver valgt" description="Velg en utøver for å se analyse." />
            </Page>
          ) : loadingAnalysis ? (
            <Page>
              <EmptyState title="Laster analyse…" />
            </Page>
          ) : (
            <AnalysisDashboard
              weeks={analysisWeeks}
              workoutsByWeekKey={analysisWorkoutsByWeekKey}
              athleteName={selectedAthleteName}
              currentWeek={currentWeek}
              currentYear={currentYear}
            />
          )}
        </>
      )}

      {tab === 'tests' && (
        <>
          {!selectedAthleteId ? (
            <Page>
              <EmptyState title="Ingen utøver valgt" description="Velg en utøver for å administrere tester." />
            </Page>
          ) : (
            <TestingDashboard
              selectedAthleteId={selectedAthleteId}
              athleteName={selectedAthleteName}
              userProfile={userProfile}
            />
          )}
        </>
      )}

      {tab === 'builder' && selectedAthleteId && (
        <AdminPlanBuilder
          currentWeek={currentWeek}
          currentYear={currentYear}
          monday={monday}
          sunday={sunday}
          isThisWeek={isThisWeek}
          workoutLayout={workoutLayout}
          selectedAthleteName={selectedAthleteName}
          workouts={workouts}
          loadingWorkouts={loadingWorkouts}
          templates={templates}
          loadingTemplates={loadingTemplates}
          overviewWeeks={overviewWeeks}
          overviewWorkoutsByWeekKey={overviewWorkoutsByWeekKey}
          loadingOverview={loadingOverview}
          analysisWeeks={analysisWeeks}
          analysisWorkoutsByWeekKey={analysisWorkoutsByWeekKey}
          loadingAnalysis={loadingAnalysis}
          onWeekChange={onWeekChange}
          onSelectWorkout={setSelectedWorkout}
          onDeleteWorkout={handleDeleteWorkout}
          onToggleComplete={handleToggleComplete}
          onMoveWorkout={moveWorkout}
          onMoveWorkoutByDrag={moveWorkoutByDrag}
          onAddTemplateToDay={handleAddTemplateToDay}
          onEditTemplate={startEditTemplate}
          onCreateTemplate={startNewTemplate}
          onDeleteTemplate={handleDeleteTemplate}
        />
      )}

      {/* ─── Øktbank tab ─── */}
      {tab === 'oktbank' && (
        <OktbankTab
          templates={templates}
          activeCategory={activeCategory}
          setActiveCategory={setActiveCategory}
          loadingTemplates={loadingTemplates}
          pickingFromBank={pickingFromBank}
          replacementTarget={replacementTarget}
          currentWeek={currentWeek}
          handleAddFromTemplate={handleAddFromTemplate}
          startEditTemplate={startEditTemplate}
          handleDeleteTemplate={handleDeleteTemplate}
          startNewTemplate={startNewTemplate}
        />
      )}

      {/* ─── Bibliotek (global library) tab ─── */}
      {tab === 'library' && (
        <LibraryBrowser
          globalTemplates={globalTemplates}
          loading={loadingGlobalTemplates}
          onAddToBank={handleAddFromLibrary}
          isAlreadyInBank={isAlreadyInBank}
          isSuperadmin={isSuperadmin}
          onEditGlobal={isSuperadmin ? startEditGlobalTemplate : null}
          onDeleteGlobal={isSuperadmin ? handleDeleteGlobalTemplate : null}
          onCreateGlobal={isSuperadmin ? startNewGlobalTemplate : null}
        />
      )}

      {/* ─── Workout detail / edit modal ─── */}
      {selectedWorkout && (
        <WorkoutDetail
          workout={selectedWorkout}
          onClose={() => setSelectedWorkout(null)}
          canEdit
          onDelete={handleDeleteWorkout}
          onToggleComplete={handleToggleComplete}
          onSaveComment={handleSaveComment}
          onEdit={handleEditWorkout}
        />
      )}

      {editingTemplate !== null && (
        <div className="modal-backdrop" onClick={event => {
          if (event.target === event.currentTarget) {
            setEditingTemplate(null)
          }
        }}>
          <div className="modal add-modal">
            <button className="modal-close" onClick={() => setEditingTemplate(null)}>
              <SystemIcon name="close" className="system-icon" />
            </button>
            <h2 className="modal-title-h2">{editingTemplate === 'new' ? 'Ny mal' : 'Rediger mal'}</h2>
            <form onSubmit={handleSaveTemplate}>
              <WorkoutForm value={templateForm} onChange={setTemplateForm} />
              <div className="form-actions form-actions--spaced">
                <button type="button" className="btn-cancel" onClick={() => setEditingTemplate(null)}>Avbryt</button>
                <button type="submit" className="btn-save">Lagre mal</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {editingGlobalTemplate !== null && (
        <div className="modal-backdrop" onClick={event => {
          if (event.target === event.currentTarget) {
            setEditingGlobalTemplate(null)
          }
        }}>
          <div className="modal add-modal">
            <button className="modal-close" onClick={() => setEditingGlobalTemplate(null)}>
              <SystemIcon name="close" className="system-icon" />
            </button>
            <h2 className="modal-title-h2">
              {editingGlobalTemplate === 'new' ? 'Ny økt i bibliotek' : 'Rediger bibliotekøkt'}
            </h2>
            <form onSubmit={handleSaveGlobalTemplate}>
              <WorkoutForm value={globalTemplateForm} onChange={setGlobalTemplateForm} />
              <div className="form-actions form-actions--spaced">
                <button type="button" className="btn-cancel" onClick={() => setEditingGlobalTemplate(null)}>Avbryt</button>
                <button type="submit" className="btn-save">Lagre i bibliotek</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </PageShell>
  )
}

// ─── Øktbank Tab ───────────────────────────────────────────────────────────

function OktbankTab({
  templates,
  activeCategory,
  setActiveCategory,
  loadingTemplates,
  pickingFromBank,
  replacementTarget,
  currentWeek,
  handleAddFromTemplate,
  startEditTemplate,
  handleDeleteTemplate,
  startNewTemplate,
}) {
  const [search, setSearch] = useState('')
  const [activitySet, setActivitySet] = useState([])

  const sportCounts = useMemo(() => {
    const counts = new Map()
    templates.forEach(t => {
      if (!t.activityTag) return
      counts.set(t.activityTag, (counts.get(t.activityTag) || 0) + 1)
    })
    return counts
  }, [templates])

  const presentSportValues = useMemo(() => Array.from(sportCounts.keys()), [sportCounts])

  const filtered = useMemo(() => {
    return templates
      .filter(t => activeCategory === 'Alle' || t.category === activeCategory)
      .filter(t => activitySet.length === 0 || activitySet.includes(t.activityTag))
      .filter(t => {
        if (!search.trim()) return true
        const term = search.trim().toLowerCase()
        const haystack = [t.title, t.description, t.notes, t.category, ACTIVITY_TAG_MAP[t.activityTag]?.label]
          .filter(Boolean).join(' ').toLowerCase()
        return haystack.includes(term)
      })
  }, [templates, activeCategory, activitySet, search])

  const filtersActive = search.length > 0 || activitySet.length > 0 || activeCategory !== 'Alle'

  function clearAll() {
    setSearch('')
    setActivitySet([])
    setActiveCategory('Alle')
  }

  return (
    <Page>
      <PageHeader
        eyebrow="Øktbank"
        title={pickingFromBank ? `Velg økt for uke ${currentWeek}` : 'Mine øktmaler'}
        subtitle={
          pickingFromBank
            ? (replacementTarget
              ? `Trykk på en økt for å bytte ut «${replacementTarget.title}»`
              : 'Trykk på en økt for å legge den til i planen')
            : `${templates.length} ${templates.length === 1 ? 'mal' : 'maler'} · trykk for å redigere`
        }
        actions={!pickingFromBank ? <Button onClick={startNewTemplate}>+ Ny mal</Button> : null}
      />

      <Toolbar>
        <SearchBox value={search} onChange={setSearch} placeholder="Søk i mine maler…" />
        <ToolbarGroup label="Sport">
          <SportPicker
            value={activitySet}
            onChange={setActivitySet}
            counts={sportCounts}
            limitToValues={presentSportValues}
          />
        </ToolbarGroup>
        <ToolbarGroup label="Kategori">
          <Chip active={activeCategory === 'Alle'} onClick={() => setActiveCategory('Alle')}>Alle</Chip>
          {TEMPLATE_CATEGORIES.filter(cat => cat !== 'Alle').map(cat => (
            <Chip key={cat} active={activeCategory === cat} onClick={() => setActiveCategory(cat)}>
              {cat}
            </Chip>
          ))}
        </ToolbarGroup>
        {filtersActive && (
          <Button variant="ghost" size="sm" onClick={clearAll}>Tøm filter</Button>
        )}
      </Toolbar>

      {loadingTemplates ? (
        <EmptyState title="Laster maler…" />
      ) : filtered.length === 0 ? (
        <EmptyState
          title={templates.length === 0 ? 'Ingen maler enda' : 'Ingen maler matcher filteret'}
          description={
            templates.length === 0
              ? 'Lag dine egne maler eller legg til økter fra biblioteket.'
              : 'Prøv et annet søk eller fjern filter.'
          }
          action={
            templates.length === 0
              ? <Button onClick={startNewTemplate}>+ Ny mal</Button>
              : (filtersActive ? <Button variant="secondary" onClick={clearAll}>Tøm filter</Button> : null)
          }
        />
      ) : (
        <>
          <div className="tp-results-count">{filtered.length} av {templates.length} maler</div>
          <div className="tp-card-grid">
            {filtered.map(template => {
              const canEdit = template.source === 'custom'
              return (
                <UITemplateCard
                  key={template.id}
                  template={template}
                  primaryLabel={pickingFromBank ? (replacementTarget ? 'Bytt ut økt' : '+ Legg til i plan') : (canEdit ? 'Rediger' : null)}
                  onPrimary={pickingFromBank ? () => handleAddFromTemplate(template) : (canEdit ? () => startEditTemplate(template) : null)}
                  primaryVariant={pickingFromBank ? 'primary' : 'secondary'}
                  onDelete={!pickingFromBank && canEdit ? () => handleDeleteTemplate(template) : null}
                />
              )
            })}
          </div>
        </>
      )}
    </Page>
  )
}

// ─── Admin Workout Row ─────────────────────────────────────────────────────

function AdminWorkoutSlot({
  workout,
  index,
  total,
  onClick,
  onDelete,
  onReplace,
  onToggleComplete,
  onMoveUp,
  onMoveDown,
  isDragging,
  isDropTarget,
  onDragStart,
  onDragEnd,
  onDragOver,
  onDrop,
}) {
  const icon = TYPE_ICONS[workout.type] || 'AN'
  const activityTag = workout.activityTag ? ACTIVITY_TAG_MAP[workout.activityTag] : null
  const scheduleLabel = formatWorkoutTime(workout) || formatWorkoutSchedule(workout, { includeWeekday: false })

  return (
    <div
      className={`pb-slot${workout.completed ? ' is-completed' : ''}${isDragging ? ' is-dragging' : ''}${isDropTarget ? ' is-target' : ''}`}
      draggable
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onDragOver={onDragOver}
      onDrop={onDrop}
    >
      <div className="pb-slot-top">
        <span className="pb-card-icon"><ActivityIcon name={icon} className="tag-icon-svg" /></span>
        <div className="pb-slot-actions">
          <span className="pb-card-grip" title="Dra for å flytte" aria-hidden="true">⋮⋮</span>
          <button className="pb-slot-reorder" onClick={onMoveUp} disabled={index === 0} title="Flytt opp">
            <SystemIcon name="up" className="system-icon" />
          </button>
          <button className="pb-slot-reorder" onClick={onMoveDown} disabled={index === total - 1} title="Flytt ned">
            <SystemIcon name="down" className="system-icon" />
          </button>
        </div>
      </div>

      <button type="button" className="pb-slot-main" onClick={() => onClick(workout)}>
        {scheduleLabel && <span className="pb-slot-time">{scheduleLabel}</span>}
        <span className="pb-slot-title">{workout.title}</span>
        {workout.description && (
          <span className="pb-slot-desc">{workout.description}</span>
        )}
        {activityTag && <span className="pb-slot-zone">{activityTag.label}</span>}
      </button>

      <div className="pb-slot-footer">
        <button className="pb-slot-reorder" onClick={() => onReplace(workout)} title="Bytt ut fra øktbank">
          <SystemIcon name="replace" className="system-icon" />
        </button>
        <button
          className={`pb-slot-check${workout.completed ? ' is-checked' : ''}`}
          onClick={() => onToggleComplete(workout)}
          aria-label={workout.completed ? 'Marker ikke fullført' : 'Marker fullført'}
        >
          {workout.completed ? <SystemIcon name="check" className="system-icon" /> : null}
        </button>
        <button className="pb-slot-reorder pb-slot-reorder--danger" onClick={() => onDelete(workout)} title="Slett">
          <SystemIcon name="delete" className="system-icon" />
        </button>
      </div>
    </div>
  )
}

// ─── Template Card ─────────────────────────────────────────────────────────

function TemplateCard({ template, pickMode, replacementMode, onPick, onEdit, onDelete }) {
  const typeColors = TYPE_COLORS[template.type] || TYPE_COLORS.annet
  const zone = normalizeIntensityZone(template.type, template.intensityZone)
  const zoneColors = ZONE_COLORS[zone]
  const zoneLabel = getIntensityZoneLabel(template)
  const icon = TYPE_ICONS[template.type] || 'AN'
  const activityTag = template.activityTag ? ACTIVITY_TAG_MAP[template.activityTag] : null
  const loadTag = template.loadTag ? LOAD_TAG_MAP[template.loadTag] : null
  const isCustomTemplate = template.source === 'custom'

  return (
    <article
      className="lib-card"
      style={loadTag ? { borderTopColor: loadTag.color } : undefined}
    >
      <header className="lib-card-head">
        <span
          className="lib-card-icon"
          style={activityTag ? { '--tag-color': activityTag.color, '--tag-bg': activityTag.bg, background: 'var(--tag-bg)', color: 'var(--tag-color)' } : undefined}
        >
          <ActivityIcon name={activityTag?.icon || icon || 'annet'} className="ui-icon" />
        </span>
        <div className="lib-card-titles">
          <h3 className="lib-card-title">{template.title}</h3>
          <div className="lib-card-meta">
            {activityTag?.label && <span>{activityTag.label}</span>}
            {template.category && <span>· {template.category}</span>}
            {zone && zoneLabel && (
              <span className="lib-card-meta-zone" style={{ '--zone-color': zoneColors?.border }}>· {zoneLabel}</span>
            )}
          </div>
        </div>
      </header>

      {template.description && (
        <p className="lib-card-desc">{template.description}</p>
      )}

      {(loadTag || template.distance) && (
        <div className="lib-card-tags">
          {loadTag && (
            <span
              className="lib-card-tag lib-card-tag--accent"
              style={{ '--tag-color': loadTag.color, '--tag-bg': loadTag.bg }}
            >
              {loadTag.label}
            </span>
          )}
          {template.distance && (
            <span className="lib-card-tag lib-card-tag--neutral">{template.distance}</span>
          )}
        </div>
      )}

      <footer className="lib-card-foot">
        {pickMode ? (
          <Button block onClick={onPick}>
            {replacementMode ? 'Bytt ut økt' : '+ Legg til i plan'}
          </Button>
        ) : isCustomTemplate ? (
          <>
            <Button block variant="secondary" size="sm" onClick={onEdit}>
              <SystemIcon name="edit" className="button-icon" />Rediger
            </Button>
            <IconButton ariaLabel="Slett mal" onClick={onDelete} size="sm" className="lib-card-danger">
              <SystemIcon name="delete" className="system-icon" />
            </IconButton>
          </>
        ) : (
          <span className="lib-card-meta lib-card-meta--flex">Kan brukes i plan, men ikke redigeres her</span>
        )}
      </footer>
    </article>
  )
}
