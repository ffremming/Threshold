import { subscribeToWorkoutWeeks } from './workoutSubscriptions'

// One-shot read: subscribe, resolve on the first fully-ready snapshot,
// then immediately unsubscribe. Used by the export flow (no live updates).
export function fetchWorkoutsOnce({ athleteId, weeks }) {
  return new Promise((resolve, reject) => {
    let unsub = () => {}
    let settled = false
    unsub = subscribeToWorkoutWeeks({
      athleteId,
      weeks,
      onData: (workouts, isReady) => {
        if (!isReady || settled) return
        settled = true
        // Defer unsub so it is assigned even if onData fires synchronously.
        Promise.resolve().then(() => unsub())
        resolve(workouts)
      },
      onError: err => {
        if (settled) return
        settled = true
        Promise.resolve().then(() => unsub())
        reject(err)
      },
    })
  })
}
