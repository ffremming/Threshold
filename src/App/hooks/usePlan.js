import { useCallback, useEffect, useRef, useState } from 'react'
import { doc, onSnapshot, setDoc, serverTimestamp } from 'firebase/firestore'
import { db } from '../../firebase'
import { withDatabaseWriteLimit } from '../../security/rateLimits'
import {
  normalizePlan,
  upsertBand as reduceUpsertBand, removeBand as reduceRemoveBand,
  upsertNote as reduceUpsertNote, removeNote as reduceRemoveNote,
  upsertGoal as reduceUpsertGoal, removeGoal as reduceRemoveGoal,
  upsertWeekTarget as reduceUpsertWeekTarget, removeWeekTarget as reduceRemoveWeekTarget,
  setPlanSettings as reduceSetPlanSettings,
} from '../../utils/planReducers'

const EMPTY_PLAN = { bands: [], notes: [], goals: [], weekTargets: [], planSettings: null }

// Subscribe to a single per-athlete plan doc (plans/{athleteId}) holding the
// bands / notes / goals annotation arrays, and expose immutable action helpers
// that write the whole changed array back. Mirrors useWorkouts' onSnapshot
// pattern; Firestore remains the source of truth, so optimistic UI is not
// needed — the next snapshot reflects every write.
export function usePlan(athleteId) {
  const [plan, setPlan] = useState(EMPTY_PLAN)
  const [planLoading, setPlanLoading] = useState(true)
  // Latest plan kept in a ref so action helpers read current arrays without
  // being re-created on every snapshot.
  const planRef = useRef(plan)
  planRef.current = plan

  useEffect(() => {
    if (!athleteId) {
      setPlan(EMPTY_PLAN)
      setPlanLoading(false)
      return
    }
    setPlanLoading(true)
    const ref = doc(db, 'plans', athleteId)
    const unsub = onSnapshot(
      ref,
      snap => {
        setPlan(snap.exists() ? normalizePlan(snap.data()) : EMPTY_PLAN)
        setPlanLoading(false)
      },
      err => {
        console.error('usePlan listen error:', err)
        setPlan(EMPTY_PLAN)
        setPlanLoading(false)
      },
    )
    return unsub
  }, [athleteId])

  // Write a single field's full array back to the doc, creating it on first
  // write. setDoc(merge) so we never clobber the sibling arrays.
  const writeField = useCallback(async (field, nextArray) => {
    if (!athleteId) return
    await withDatabaseWriteLimit('plans', () => setDoc(
      doc(db, 'plans', athleteId),
      { athleteId, [field]: nextArray, updatedAt: serverTimestamp() },
      { merge: true },
    ))
  }, [athleteId])

  const now = () => Date.now()

  const upsertBand = useCallback(
    band => writeField('bands', reduceUpsertBand(planRef.current, band, now())),
    [writeField])
  const removeBand = useCallback(
    id => writeField('bands', reduceRemoveBand(planRef.current, id)),
    [writeField])

  const upsertNote = useCallback(
    note => writeField('notes', reduceUpsertNote(planRef.current, note, now())),
    [writeField])
  const removeNote = useCallback(
    id => writeField('notes', reduceRemoveNote(planRef.current, id)),
    [writeField])

  const upsertGoal = useCallback(
    goal => writeField('goals', reduceUpsertGoal(planRef.current, goal, now())),
    [writeField])
  const removeGoal = useCallback(
    id => writeField('goals', reduceRemoveGoal(planRef.current, id)),
    [writeField])

  const upsertWeekTarget = useCallback(
    target => writeField('weekTargets', reduceUpsertWeekTarget(planRef.current, target, now())),
    [writeField])
  const removeWeekTarget = useCallback(
    id => writeField('weekTargets', reduceRemoveWeekTarget(planRef.current, id)),
    [writeField])
  const setPlanSettings = useCallback(
    patch => writeField('planSettings', reduceSetPlanSettings(planRef.current, patch, now())),
    [writeField])

  return {
    plan,
    planLoading,
    planActions: {
      upsertBand, removeBand, upsertNote, removeNote, upsertGoal, removeGoal,
      upsertWeekTarget, removeWeekTarget, setPlanSettings,
    },
  }
}
