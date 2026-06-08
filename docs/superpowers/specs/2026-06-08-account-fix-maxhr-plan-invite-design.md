# Design: My Account fix, Max HR on profile, and plan-view invites

Date: 2026-06-08
Status: Draft — awaiting user review

## Overview

Three independent changes, bundled because they all touch the athlete's "My
Account" surface:

1. **Bug fix** — the "My Account" button in the sidebar does nothing when
   clicked from the Athletes overview or Users (admin) spaces (and sometimes
   from the Plan view).
2. **Feature** — let the athlete view and edit their own training profile
   (Max HR + zones) from My Account. Today only coaches can edit it.
3. **Feature** — let an athlete generate an invite link that turns a non-user
   into a coach (read + write on the athlete's plan) after the invitee signs
   up.

Each change is small and largely reuses existing primitives. Part 3 is the only
one that touches Firestore security rules.

---

## Part 1 — Bug: "My Account" does not respond

### Root cause

The app tracks each top-level "space" as an independent boolean in
`src/App/index.jsx`: `showAdmin`, `showAthleteOverview`, `showUserManagement`,
`showMyAccount`. `src/App/AppRoutes.jsx` renders the **first** flag that is true,
in this priority order:

1. `showUserManagement && isSuperadmin`
2. `showAthleteOverview && canManageWorkouts`
3. `showMyAccount && isAthlete`
4. `showAdmin && canManageWorkouts`
5. fallback → `MainShell` (Plan)

The sidebar account button (`src/App/primaryNav.jsx:188`) calls only
`setShowMyAccount(true)`. It never clears the other flags. So if
`showAthleteOverview` or `showUserManagement` is already true (both checked
*before* My Account), the My Account screen never renders and the click looks
dead. The existing nav items avoid this because each one calls `goPlan()` first,
which resets the other three flags.

### Fix

In `src/App/primaryNav.jsx`, introduce a `goAccount()` action that mirrors
`goPlan()` — reset the other three space flags, then set `showMyAccount(true)` —
and wire the account button to it:

```js
const goAccount = () => {
  setShowAthleteOverview(false)
  setShowAdmin(false)
  setShowUserManagement(false)
  setShowMyAccount(true)
}
// ...
onClick={goAccount}
```

This is a one-place fix that resolves all three repro paths (Athletes, Users,
Plan) uniformly, because My Account now always starts from a clean slate.

### Test

`src/App/primaryNav.test.jsx` (new or extended): render `NavProvider` with spy
setters, invoke the account button's `onClick`, assert that
`setShowAthleteOverview(false)`, `setShowAdmin(false)`,
`setShowUserManagement(false)`, and `setShowMyAccount(true)` were all called.

---

## Part 2 — Max HR + training profile on My Account

### Current state

- The athlete's My Account page is `src/components/MyCoaches/index.jsx`; it
  renders only a "My coaches" relationship list.
- `src/components/AthleteDetail/ProfileCard.jsx` already renders an editable
  Max HR + threshold/VO2max/easy/long-pace form, wired to
  `updateAthleteMaxHr` and `updateAthleteZones`. It is currently shown only to
  coaches viewing an athlete.
- Firestore rules already permit an athlete to update their own `maxHr` and
  zones via `isSafeProfileUpdate()` (the athlete is `request.auth.uid == userId`).
  **No rules change needed.**

### Fix

Add a "My profile" section to the My Account page that reuses `ProfileCard` with
`profile={currentUser}`:

```jsx
<Page>
  <ProfileCard profile={currentUser} />
  <RelationshipSection ... />  {/* existing coaches list */}
</Page>
```

The athlete can now self-edit Max HR (and the other zone fields) from their own
account. The page keeps two sections (My profile, My coaches) under the existing
"My account" shell.

Confirm `currentUser` passed into `MyCoaches` is the live `userProfile` (it is —
`MyAccountScreen` passes `userProfile`). `ProfileCard`'s `useEffect` already
re-syncs when `profile.maxHr` etc. change, so live snapshot updates flow in.

### Test

Extend/add `src/components/MyCoaches/*.test.jsx`: render with a profile carrying
`maxHr`, assert the Max HR input shows the value; the existing `ProfileCard`
save logic is already covered by its own tests (verify they exist; add a focused
one if not).

---

## Part 3 — Invite a non-user to co-coach the plan

### Goal

An athlete generates a link. A non-user opens it, signs up, and becomes a
**coach** of that athlete — read + write on the athlete's plan — using the
existing relationship/`canAccessAthlete` model. No new permission surface on
`workouts`.

### New collection: `invites`

Doc id: a random unguessable `code` (also stored in the doc).

```
invites/{code}
  code        string   // == document id
  athleteId   string   // the athlete granting access
  createdBy   string   // == athleteId (the creator)
  status      string   // 'pending' | 'accepted' | 'revoked'
  acceptedBy  string?  // uid of the user who accepted
  createdAt   timestamp
  updatedAt   timestamp
```

### Flow

1. **Create (athlete):** From My Account, athlete clicks "Invite someone to my
   plan". App writes `invites/{code}` with `status: 'pending'`,
   `athleteId == createdBy == request.auth.uid`. App shows a shareable link
   `<origin>/?invite=<code>` with a copy button. Athlete sees a list of pending
   invites with a "Revoke" action.

2. **Open link (non-user):** App reads `?invite=<code>` on load, stores the code
   (sessionStorage), and shows the Login/signup screen with a banner: "Sign up
   to get coach access to <athlete>'s plan." Existing signup creates a
   `pending` athlete user (unchanged).

3. **Accept (after auth):** Once authenticated and the user has a profile, if a
   stored invite code resolves to a `pending` invite whose `athleteId != self`,
   the app:
   - creates `relationships/{selfUid}_{athleteId}` (self is the coach), and
   - updates the invite to `status: 'accepted', acceptedBy: selfUid`.
   The new coach now has read+write on the athlete's workouts via existing rules.
   The stored code is cleared and the `?invite` param stripped from the URL.

4. **Revoke (athlete):** Athlete sets a pending invite to `status: 'revoked'`.
   Already-accepted invites are not retroactively revoked here — to remove an
   accepted coach, the athlete removes the relationship from "My coaches" (a coach
   they invited appears there like any other coach). This is called out in the UI.

### The `pending`-status problem + auto-activation (DECIDED: bypass)

A freshly self-created user has `status: 'pending'`, and almost every rule helper
requires `isActiveUser()`. The invitee must be able to:

- **read** the invite by code,
- **create** the relationship + **update** the invite to accepted, and
- **auto-activate** their own account (DECISION: invited users bypass the
  superadmin activation gate).

**Auto-activation rule (the sensitive part).** A signed-in `pending` user may
flip *their own* `status` from `pending` to `active` — and ONLY `status`/
`updatedAt` — **iff a matching pending invite exists** that they are accepting.
The proof is a `get()` to an `invites` doc:

```
function hasAcceptablePendingInvite() {
  // The client passes the code it is redeeming via the user doc is NOT possible;
  // instead the activation is gated on the existence of ANY pending invite whose
  // athleteId != self. To make this precise and forgeable-proof, the user doc
  // carries a transient `activatingInvite` code on the activation write, and the
  // rule verifies that invite is pending and not self-authored.
  return request.resource.data.activatingInvite is string
    && exists(/databases/$(database)/documents/invites/$(request.resource.data.activatingInvite))
    && get(/databases/$(database)/documents/invites/$(request.resource.data.activatingInvite)).data.status == 'pending'
    && get(/databases/$(database)/documents/invites/$(request.resource.data.activatingInvite)).data.athleteId != request.auth.uid;
}
```

The `activatingInvite` field is write-only scaffolding on that single update; the
implementation will instead prefer the cleaner approach below if the emulator
shows field-passing is awkward.

**Preferred concrete sequence (verified against emulator during impl):**

1. Invitee signs up → `pending` user doc exists (unchanged).
2. App reads the stored invite code, `get()`s the invite, confirms it is
   `pending` and `athleteId != self`.
3. App performs, in order, each guarded by its own rule:
   a. **create** `relationships/{self}_{athleteId}` — allowed because a pending
      invite for that athlete exists and caller is the coach (see relationship
      rule below);
   b. **update own user** `status: pending → active` — allowed because the same
      pending invite exists (`hasAcceptablePendingInvite`);
   c. **update invite** `status → accepted, acceptedBy: self`.

Because step (b) makes the user `active`, `isCoachOf` / `canAccessAthlete` then
pass and the invited coach has immediate read+write on the plan — no superadmin
step. The activation is provably tied to a real pending invite, so it cannot be
used to self-activate without one.

> Security note for review: this is the one place a user can change their own
> `status`. It is constrained to `pending → active`, only `status`/`updatedAt`
> may change, and only when a real pending invite (authored by someone else)
> exists. No other status transition (e.g. `disabled → active`) is permitted.

### Firestore rules: `invites`

```
match /invites/{code} {
  // Athlete reads their own invites; a signed-in user may read a pending invite
  // by code to accept it (code is the unguessable doc id).
  allow read: if signedIn() && (
    resource.data.athleteId == request.auth.uid ||
    resource.data.status == 'pending'
  );

  // Only the athlete creates their own pending invite.
  allow create: if isActiveUser()
    && request.resource.data.keys().hasOnly(
        ['code','athleteId','createdBy','status','acceptedBy','createdAt','updatedAt'])
    && code == request.resource.data.code
    && request.resource.data.athleteId == request.auth.uid
    && request.resource.data.createdBy == request.auth.uid
    && request.resource.data.status == 'pending'
    && request.resource.data.createdAt == request.time;

  // The athlete may revoke a pending invite.
  allow update: if isActiveUser()
    && resource.data.athleteId == request.auth.uid
    && resource.data.status == 'pending'
    && request.resource.data.status == 'revoked'
    && request.resource.data.diff(resource.data).affectedKeys()
        .hasOnly(['status','updatedAt']);

  // A signed-in invitee accepts a pending invite (works while still pending-status).
  allow update: if signedIn()
    && resource.data.status == 'pending'
    && resource.data.athleteId != request.auth.uid
    && request.resource.data.status == 'accepted'
    && request.resource.data.acceptedBy == request.auth.uid
    && request.resource.data.diff(resource.data).affectedKeys()
        .hasOnly(['status','acceptedBy','updatedAt']);
}
```

### Firestore rules: `users` self-activation via invite

Extend the `users` update rule to permit the constrained self-activation
described above, in addition to the existing `isSafeProfileUpdate` self-edit:

```
allow update: if isActiveUser() && (
    (isSuperadmin() && isValidUserAdminUpdate()) ||
    (request.auth.uid == userId && isSafeProfileUpdate()) ||
    (isCoachOf(userId) && isSafeProfileUpdate())
  )
  // NEW: a pending user activates themselves via a valid pending invite.
  || (
    signedIn()
    && request.auth.uid == userId
    && getUserData().status == 'pending'      // currently pending
    && request.resource.data.status == 'active'
    && changedKeys().hasOnly(['status', 'updatedAt'])
    && hasAcceptablePendingInvite()
  );
```

Note the existing first branch requires `isActiveUser()`, so the new branch is
a separate top-level `||` that works while the caller is still `pending`. The
`isValidSelfCreate` create rule is unchanged (still creates as `pending`).

### Firestore rules: `relationships` create by invitee

The existing relationship rule only lets the **athlete** (`request.auth.uid ==
athleteId`) or a superadmin create a link. The invitee is the *coach*, so we add
one allowance: a signed-in user may create the relationship where they are the
coach **iff** a matching pending invite exists.

```
allow create: if signedIn()
  && (
    isSuperadmin()
    || request.auth.uid == request.resource.data.athleteId
    || (
      request.auth.uid == request.resource.data.coachId
      && existsAcceptableInvite(request.resource.data.athleteId)
    )
  )
  && request.resource.data.coachId is string
  && request.resource.data.athleteId is string
  && relationshipId == request.resource.data.coachId + '_' + request.resource.data.athleteId;
```

where `existsAcceptableInvite` checks there is a `pending`/just-accepted invite
for that athlete (implementation: the client accepts the invite and creates the
relationship; rules verify the relationship's athleteId matches an invite the
caller is accepting). Exact predicate finalized during implementation against the
emulator — this is the part to test hardest.

> Note: because rule evaluation can't easily "join" to the invite the client is
> simultaneously updating, the implementation will **create the relationship
> first** (guarded by a `get()` to a pending invite for that athlete with the
> caller eligible), **then** mark the invite accepted. Order and predicate are
> verified with the Firestore emulator in tests.

### Client modules

- `src/userService/invites.js` (new): `createInvite(athleteId)`,
  `onMyInvitesSnapshot(athleteId, cb)`, `revokeInvite(code)`,
  `getInvite(code)`, `acceptInvite(code, selfUid)` (creates relationship +
  marks accepted). Random code via `crypto.randomUUID()`.
- `src/userService/index.js`: re-export the new functions.
- My Account UI: an "Invite to my plan" section listing pending invites with
  copy-link and revoke.
- `src/App/index.jsx` (or `useAuth`): on load, capture `?invite=<code>` →
  sessionStorage; after auth + profile present, run the accept flow once, then
  clear and strip the URL param. Show a signup banner referencing the athlete.

### Tests

- `invites.js` unit tests (code generation, payload shape) with mocked Firestore.
- Firestore rules tests in the emulator: athlete create/revoke; invitee read
  pending; invitee accept + relationship create; rejection of forged invites,
  non-pending accepts, and self-invite. This is the highest-risk surface — cover
  it thoroughly.
- Accept-flow integration test: mount app with `?invite=<code>`, simulate
  auth, assert relationship created and param stripped.

---

## Out of scope / YAGNI

- Public/token-based unauthenticated plan viewing (rejected: user wants invitee
  to create an account with read+write).
- Time-expiring links / passcodes (not requested).
- Email delivery of the invite — the athlete shares the link themselves.

## Security review focus (Part 3)

Because invited users now **self-activate**, the rules tests must prove a
pending user CANNOT:
- activate without any invite, or with a `revoked`/`accepted` invite;
- activate using an invite whose `athleteId == self` (self-invite);
- change anything other than `status`/`updatedAt` during activation;
- transition `disabled → active`.
And CAN: activate exactly once via a genuine pending invite authored by another
athlete. Run `/security-review` on the rules diff before merge.

## Sequencing

Parts 1 and 2 are independent and low-risk — ship them first. Part 3 is the
larger change and gates on the rules-acceptance decision above.
```