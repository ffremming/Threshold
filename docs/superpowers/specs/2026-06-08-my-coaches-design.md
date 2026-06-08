# My Coaches — athletes pick their own coaches

**Date:** 2026-06-08
**Status:** Approved design, pending implementation

## Goal

Let athletes self-serve the choice of which coach(es) follow them up, instead of
requiring a superadmin to wire every coach↔athlete relationship in the admin
Users area.

## Scope (decided)

- **Athlete picks coach only.** Athletes choose their coach(es). Coaches still
  manage their athlete roster through the existing admin Users area; this page
  adds nothing for coach-only users.
- **Athlete-only page.** The page only does coach-picking. No adaptive per-role
  sections.
- **Coach list, names only.** When adding, the athlete browses active coaches by
  display name. No email is shown in the UI.
- **Entry point: account block.** Reached by clicking the athlete's own account
  block in the sidebar — no new top-level nav item.
- **Add and remove.** The athlete can both add and remove their own coach links.

Out of scope: request/approval flow, coaches picking athletes here, search-by-email.

## Architecture

### Entry point
The account block (`th-account`) in [primaryNav.jsx](../../../src/App/primaryNav.jsx)
becomes clickable for users with the `athlete` role. Clicking it opens the new
page. Wire a `showMyAccount` toggle through the same path as the existing
`showUserManagement` toggle:

- `App` state: `showMyAccount` / `setShowMyAccount`
- Passed into `NavProvider` so the account block can call `setShowMyAccount(true)`
- Handled in [AppRoutes.jsx](../../../src/App/AppRoutes.jsx) with a new screen branch
  (rendered before `MainShell`, gated by `showMyAccount` and the `athlete` role).

The "Sign out" button inside the account block must keep working — only the
profile/meta area triggers navigation, not the whole block, to avoid swallowing
the logout click.

### Page component — `src/components/MyCoaches/`
- `index.jsx` — container. Subscribes to relationships and the coach list,
  derives the athlete's current coaches and the unassigned coaches, and renders
  the view. Owns add/remove handlers.
- View reuses the existing `RelationshipSection` component
  ([RelationshipSection.jsx](../../../src/components/UserManagement/RelationshipSection.jsx))
  for the "My coaches (N)" + "Add coach" UI, so the look matches admin exactly.
  - `members` = current coaches (remove button each)
  - `unassigned` = active coaches not yet linked and not self
  - Names only — `RelationshipSection` currently renders `member.email`; we pass
    coach objects with `email` omitted/blank so the UI shows names only, OR add a
    `hideEmail` prop. **Decision: add a `hideEmail` prop** to RelationshipSection
    (defaults false → admin unchanged) rather than mangling the data.
- Wrapped in the standard `PageShell` with a `ShellBrand` back button (back =
  `setShowMyAccount(false)`), matching `UserDetail`.

### Data layer — `src/userService/`
Reuses from [relationships.js](../../../src/userService/relationships.js):
- `addRelationship(coachId, athleteId)`
- `removeRelationship(coachId, athleteId)`
- `onRelationshipsSnapshot(cb)` — athlete can read their own relationship docs
  (rules already allow `athleteId == request.auth.uid`).

New function `onCoachesSnapshot(cb)`:
- Query `users` where `roles array-contains 'coach'` and status active.
- Needed because `onAllUsersSnapshot` is superadmin-gated. Returns normalized
  user docs via the existing `normalizeUserDoc`.

## Security (firestore.rules)

Two changes, both additive (superadmin powers untouched):

1. **`relationships` create/delete** — also allow when the writer is the athlete
   on the link:
   ```
   allow create, update: if (isSuperadmin() || request.auth.uid == request.resource.data.athleteId)
     && request.resource.data.coachId is string
     && request.resource.data.athleteId is string
     && relationshipId == request.resource.data.coachId + '_' + request.resource.data.athleteId;
   allow delete: if isSuperadmin() || resource.data.athleteId == request.auth.uid;
   ```
   The athlete must be active (wrap in `isActiveUser()`).

2. **`users` read** — allow an active user to read a doc whose `roles` contains
   `coach`, so athletes can browse the coach directory:
   ```
   allow read: if signedIn() && (
     request.auth.uid == userId ||
     isSuperadmin() ||
     (hasRole('coach') && isCoachOf(userId)) ||
     (isActiveUser() && 'coach' in resource.data.roles)
   );
   ```

### Accepted caveat
The `users` read rule exposes the coach's full doc — including `email` — at the
database level. The UI shows names only, but a determined athlete could read the
email via the SDK. The user accepted this trade-off rather than building a
separate public coach-directory collection.

## Data flow

1. Athlete clicks account block → `showMyAccount = true`.
2. `MyCoaches` mounts → subscribes to `onRelationshipsSnapshot` +
   `onCoachesSnapshot`.
3. Derive `myCoaches` (relationships where `athleteId == me`, joined to coach
   docs) and `unassigned` (active coaches minus myCoaches minus self).
4. Add → `addRelationship(coachId, me.uid)`; remove → `removeRelationship(...)`.
5. Live snapshots re-render both lists.

## Error handling

- Add/remove failures: `window.alert` with the error message, matching the
  existing UserManagement handlers.
- Remove confirms via `window.confirm`, matching admin behavior.
- If the user is not an athlete, the screen branch does not render (falls through
  to `MainShell`).

## Testing

- Unit: `onCoachesSnapshot` filters to active coaches; relationship derivation
  (myCoaches / unassigned) excludes self and already-linked coaches.
- Component: `MyCoaches` renders current coaches, add flow calls
  `addRelationship` with `(coachId, me)`, remove calls `removeRelationship`,
  names-only (no email in DOM).
- Rules: athlete can create/delete a relationship where they are `athleteId`,
  cannot create one where they are not; athlete can read coach docs, cannot read
  arbitrary athlete docs.

## Files touched

- `src/components/MyCoaches/index.jsx` (new)
- `src/components/UserManagement/RelationshipSection.jsx` (add `hideEmail` prop)
- `src/userService/relationships.js` (add `onCoachesSnapshot`)
- `src/userService/index.js` (re-export)
- `src/App/index.jsx` (state + wiring)
- `src/App/primaryNav.jsx` (clickable account block)
- `src/App/AppRoutes.jsx` (new screen branch)
- `src/App/AdminScreens.jsx` (new screen wrapper, if following that pattern)
- `firestore.rules` (two additive rules)
