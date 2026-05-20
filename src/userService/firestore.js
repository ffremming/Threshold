// Shared Firestore helpers for the user service modules.

export function normalizeUserDoc(snapshot) {
  const data = snapshot.data()
  return {
    id: snapshot.id,
    uid: data.uid || snapshot.id,
    ...data,
  }
}

export function relationshipId(coachId, athleteId) {
  return `${coachId}_${athleteId}`
}
