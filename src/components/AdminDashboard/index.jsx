import { useEffect, useMemo, useState } from 'react'
import {
  getAdjacentWeek,
  getWeekDates,
  getWeekKey,
  getWeekNumber,
  getWeekWindow,
} from '../../utils'
import WorkoutDetail from '../WorkoutDetail'
import '../LibraryBrowser.css'
import '../AdminPlanBuilder.css'
import { EMPTY_TEMPLATE } from './constants'
import {
  useCoachTemplates,
  useCompletedActivities,
  useGlobalTemplates,
  useWeekWorkouts,
  useWeeklyRangeWorkouts,
} from './hooks'
import { useAdminActions } from './useAdminActions'
import { usePlan } from '../../App/hooks/usePlan'
import { useUndo } from './useUndo'
import { deriveAdminState } from './derived'
import { mergeStravaIntoAnalysis, stravaActivityToWorkoutShape } from '../../strava/activityToWorkout'
import CustomFormView from './CustomFormView'
import Shell from './Shell'
import TabContent from './TabContent'
import { TemplateEditorModal, GlobalTemplateEditorModal } from './TemplateModals'

export default function AdminDashboard({
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
  const [selectedWorkout, setSelectedWorkout] = useState(null)
  const [showCustomForm, setShowCustomForm] = useState(false)
  const [customForm, setCustomForm] = useState({ ...EMPTY_TEMPLATE })
  const [replacementTarget, setReplacementTarget] = useState(null)
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

  const { workouts, loading: loadingWorkouts } = useWeekWorkouts(selectedAthleteId, currentWeek, currentYear)
  const { workouts: overviewWorkouts, loading: loadingOverview } = useWeeklyRangeWorkouts(selectedAthleteId, overviewWeeks, overviewWeekKeys)
  const { workouts: analysisWorkouts, loading: loadingAnalysis } = useWeeklyRangeWorkouts(selectedAthleteId, analysisWeeks, analysisWeekKeys)
  const { templates, loading: loadingTemplates } = useCoachTemplates(userProfile?.uid)
  const { templates: globalTemplates, loading: loadingGlobalTemplates } = useGlobalTemplates(userProfile?.uid)
  const completedActivities = useCompletedActivities(selectedAthleteId)
  // Per-athlete plan annotations (focus bands, post-it notes, competitions).
  const { plan, planActions } = usePlan(selectedAthleteId)

  // Merge imported Strava activities into the analysis window before deriving
  // state: they are the source of truth for completed past-week sessions.
  const mergedAnalysisWorkouts = useMemo(() => {
    if (!completedActivities.length) return analysisWorkouts
    const stravaWorkouts = completedActivities.map(stravaActivityToWorkoutShape)
    return mergeStravaIntoAnalysis(analysisWorkouts, stravaWorkouts)
  }, [analysisWorkouts, completedActivities])

  const selectedWorkoutId = selectedWorkout?.id
  useEffect(() => {
    if (!selectedWorkoutId) return
    // Refresh the selected workout's data when either the current week or the
    // multi-week overview changes. A workout opened from the month view lives in
    // overviewWorkouts, not the loaded week, so only fall back to null when it is
    // absent from BOTH pools (i.e. actually deleted) — never just because it sits
    // in a different week than the one currently loaded.
    const fresh = workouts.find(w => w.id === selectedWorkoutId)
      || overviewWorkouts.find(w => w.id === selectedWorkoutId)
    if (fresh) setSelectedWorkout(fresh)
    else setSelectedWorkout(null)
  }, [workouts, overviewWorkouts, selectedWorkoutId])

  function prevWeek() {
    const p = getAdjacentWeek(currentWeek, currentYear, -1)
    onWeekChange(p.week, p.year)
  }
  function nextWeek() {
    const n = getAdjacentWeek(currentWeek, currentYear, 1)
    onWeekChange(n.week, n.year)
  }

  // Single-step undo for plan edits, active on the builder tab. A dialog/form
  // open means another surface owns the keyboard, so suppress undo then.
  const { pushUndo } = useUndo({
    enabled: tab === 'builder',
    modalOpen: Boolean(selectedWorkout) || showCustomForm
      || Boolean(editingTemplate) || Boolean(editingGlobalTemplate),
  })

  const actions = useAdminActions({
    selectedAthleteId, currentWeek, currentYear, workouts, overviewWorkouts, isSuperadmin, userProfile, templates,
    selectedWorkout, setSelectedWorkout,
    replacementTarget, setReplacementTarget,
    customForm, setCustomForm, setShowCustomForm,
    setPickingFromBank, setTab,
    pushUndo,
    draggedWorkoutId, setDraggedWorkoutId, setDropTarget,
    templateForm, setTemplateForm, editingTemplate, setEditingTemplate,
    globalTemplateForm, setGlobalTemplateForm, editingGlobalTemplate, setEditingGlobalTemplate,
    onClose,
  })

  const selectedWeekKey = getWeekKey(currentWeek, currentYear)
  const derived = useMemo(() => deriveAdminState({
    workouts, overviewWorkouts, analysisWorkouts: mergedAnalysisWorkouts,
    activeTagFilter, athletes, selectedAthleteId, userProfile,
  }), [workouts, overviewWorkouts, mergedAnalysisWorkouts, activeTagFilter, athletes, selectedAthleteId, userProfile])

  if (showCustomForm) {
    return (
      <CustomFormView
        customForm={customForm}
        setCustomForm={setCustomForm}
        onSubmit={actions.handleAddCustom}
        onCancel={() => setShowCustomForm(false)}
        currentWeek={currentWeek}
      />
    )
  }

  function changeTab(next) {
    setTab(next)
    setReplacementTarget(null)
    if (next !== 'oktbank') setPickingFromBank(false)
  }

  const tabProps = {
    ...actions, ...derived,
    tab, selectedAthleteId, athletes, userProfile, isSuperadmin,
    currentWeek, currentYear, monday, sunday, isThisWeek,
    onWeekChange, prevWeek, nextWeek,
    workoutLayout, onWorkoutLayoutChange,
    workouts, loadingWorkouts,
    templates, loadingTemplates, globalTemplates, loadingGlobalTemplates,
    overviewWeeks, overviewWorkouts, loadingOverview, selectedWeekKey,
    analysisWeeks, loadingAnalysis,
    showOverview, setShowOverview,
    activeTagFilter, setActiveTagFilter,
    pickingFromBank, replacementTarget,
    setReplacementTarget, setCustomForm, setPickingFromBank, setTab, setShowCustomForm,
    setSelectedWorkout,
    draggedWorkoutId, dropTarget,
    plan, planActions, noteAuthor: 'coach',
  }

  return (
    <Shell tab={tab} onTabChange={changeTab}>
      <TabContent {...tabProps} />

      {selectedWorkout && (
        <WorkoutDetail
          workout={selectedWorkout}
          onClose={() => setSelectedWorkout(null)}
          canEdit
          onDelete={actions.handleDeleteWorkout}
          onToggleComplete={actions.handleToggleComplete}
          onSaveComment={actions.handleSaveComment}
          onEdit={actions.handleEditWorkout}
        />
      )}

      <TemplateEditorModal
        editingTemplate={editingTemplate}
        templateForm={templateForm}
        setTemplateForm={setTemplateForm}
        onSave={actions.handleSaveTemplate}
        onClose={() => setEditingTemplate(null)}
      />

      <GlobalTemplateEditorModal
        editingGlobalTemplate={editingGlobalTemplate}
        globalTemplateForm={globalTemplateForm}
        setGlobalTemplateForm={setGlobalTemplateForm}
        onSave={actions.handleSaveGlobalTemplate}
        onClose={() => setEditingGlobalTemplate(null)}
      />
    </Shell>
  )
}
