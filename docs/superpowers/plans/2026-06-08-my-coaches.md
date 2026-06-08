# My Coaches Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let athletes self-serve picking and removing their own coach(es) from a page reached via their account block in the sidebar.

**Architecture:** A new `MyCoaches` container subscribes to live relationships + a coach directory, derives current/unassigned coaches, and renders the existing `RelationshipSection` (extended with a `hideEmail` prop) inside the standard `PageShell`. Reached through a new `showMyAccount` toggle wired exactly like `showUserManagement`. Two additive Firestore rule changes let athletes read coach docs and write their own relationship links.

**Tech Stack:** React, Firebase Firestore, Vitest + @testing-library/react. Tests run with `npx vitest run <path>`.

---

## Conventions

- No `test` npm script exists. Run a single test file with: `npx vitest run <path>`.
- Tests use vitest globals (`describe/it/expect/vi`) — no imports needed for those, but importing them is also fine and matches existing files (see `src/components/AdminPlanBuilder/MonthSelection.test.jsx`).
- Firestore is mocked in component/unit tests with `vi.mock`.

---

## Task 1: Coach directory subscription (`onCoachesSnapshot`)

**Files:**
- Modify: `src/userService/relationships.js`
- Modify: `src/userService/index.js:22-27`
- Test: `src/userService/relationships.test.js` (create)

- [ ] **Step 1: Write the failing test**

Create `src/userService/relationships.test.js`:

```js
import { describe, it, expect, vi, beforeEach } from 'vitest'

const onSnapshot = vi.fn()
const collection = vi.fn((_db, name) => ({ __col: name }))
const query = vi.fn((...args) => ({ __query: args }))
const where = vi.fn((field, op, value) => ({ field, op, value }))

vi.mock('firebase/firestore', () => ({
  onSnapshot: (...args) => onSnapshot(...args),
  collection: (...args) => collection(...args),
  query: (...args) => query(...args),
  where: (...args) => where(...args),
  doc: vi.fn(),
  setDoc: vi.fn(),
  getDocs: vi.fn(),
  deleteDoc: vi.fn(),
  serverTimestamp: vi.fn(),
}))
vi.mock('../firebase', () => ({ db: {} }))
vi.mock('../security/rateLimits', () => ({ withDatabaseWriteLimit: (_k, fn) => fn() }))

import { onCoachesSnapshot } from './relationships'

describe('onCoachesSnapshot', () => {
  beforeEach(() => { onSnapshot.mockReset(); where.mockClear() })

  it('queries active coaches and normalizes docs', () => {
    const cb = vi.fn()
    onSnapshot.mockImplementation((_q, handler) => {
      handler({
        docs: [
          { id: 'c1', data: () => ({ uid: 'c1', displayName: 'Coach One', roles: ['coach'], status: 'active' }) },
        ],
      })
      return () => {}
    })

    onCoachesSnapshot(cb)

    expect(where).toHaveBeenCalledWith('roles', 'array-contains', 'coach')
    expect(cb).toHaveBeenCalledWith([
      expect.objectContaining({ uid: 'c1', displayName: 'Coach One', status: 'active' }),
    ])
  })

  it('filters out non-active coaches', () => {
    const cb = vi.fn()
    onSnapshot.mockImplementation((_q, handler) => {
      handler({
        docs: [
          { id: 'c1', data: () => ({ uid: 'c1', roles: ['coach'], status: 'active' }) },
          { id: 'c2', data: () => ({ uid: 'c2', roles: ['coach'], status: 'disabled' }) },
        ],
      })
      return () => {}
    })

    onCoachesSnapshot(cb)
    expect(cb).toHaveBeenCalledWith([expect.objectContaining({ uid: 'c1' })])
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/userService/relationships.test.js`
Expected: FAIL — `onCoachesSnapshot` is not exported.

- [ ] **Step 3: Implement `onCoachesSnapshot`**

In `src/userService/relationships.js`, the import line already is:
```js
import {
  doc, setDoc, getDocs, deleteDoc,
  collection, query, where, onSnapshot, serverTimestamp,
} from 'firebase/firestore'
```
(no import change needed — `query`, `where`, `collection`, `onSnapshot` are present).

Add at the end of the file:

```js
// Live list of active coaches, for athletes browsing who to link to.
// Firestore rules permit any active user to read docs whose roles include 'coach'.
export function onCoachesSnapshot(callback) {
  return onSnapshot(
    query(collection(db, 'users'), where('roles', 'array-contains', 'coach')),
    snap => {
      const coaches = snap.docs
        .map(normalizeUserDoc)
        .filter(u => (u.status || 'active') === 'active')
      callback(coaches)
    }
  )
}
```

`normalizeUserDoc` is already imported in this file (`import { normalizeUserDoc, relationshipId } from './firestore'`).

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/userService/relationships.test.js`
Expected: PASS (2 tests).

- [ ] **Step 5: Re-export from index**

In `src/userService/index.js`, extend the relationships export block:

```js
export {
  addRelationship,
  removeRelationship,
  onRelationshipsSnapshot,
  onCoachAthletesSnapshot,
  onCoachesSnapshot,
} from './relationships'
```

- [ ] **Step 6: Commit**

```bash
git add src/userService/relationships.js src/userService/relationships.test.js src/userService/index.js
git commit -m "feat: onCoachesSnapshot — live active-coach directory"
```

---

## Task 2: `hideEmail` prop on RelationshipSection

**Files:**
- Modify: `src/components/UserManagement/RelationshipSection.jsx`
- Test: `src/components/UserManagement/RelationshipSection.test.jsx` (create)

- [ ] **Step 1: Write the failing test**

Create `src/components/UserManagement/RelationshipSection.test.jsx`:

```jsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import RelationshipSection from './RelationshipSection'

// Stub ui primitives to plain elements so we test this component in isolation.
vi.mock('../ui', () => ({
  Button: ({ children, ...p }) => <button {...p}>{children}</button>,
  IconButton: ({ children, ariaLabel, ...p }) => <button aria-label={ariaLabel} {...p}>{children}</button>,
  Section: ({ title, children }) => <section><h2>{title}</h2>{children}</section>,
}))

const base = {
  title: 'Coaches',
  subtitle: '',
  emptyLabel: 'none',
  addLabel: 'Add coach',
  assignTitle: 'Pick',
  noneLeftLabel: 'no more',
  unassigned: [],
  onAdd: vi.fn(),
  onRemove: vi.fn(),
}

describe('RelationshipSection hideEmail', () => {
  it('shows email by default', () => {
    render(<RelationshipSection {...base} members={[{ uid: 'c1', displayName: 'Coach One', email: 'c1@x.com' }]} />)
    expect(screen.getByText('c1@x.com')).toBeInTheDocument()
  })

  it('hides email when hideEmail is set', () => {
    render(<RelationshipSection {...base} hideEmail members={[{ uid: 'c1', displayName: 'Coach One', email: 'c1@x.com' }]} />)
    expect(screen.queryByText('c1@x.com')).not.toBeInTheDocument()
    expect(screen.getByText('Coach One')).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/components/UserManagement/RelationshipSection.test.jsx`
Expected: FAIL — the second test finds `c1@x.com` because email always renders.

- [ ] **Step 3: Implement `hideEmail`**

In `src/components/UserManagement/RelationshipSection.jsx`:

Change the signature to accept `hideEmail = false`:

```jsx
export default function RelationshipSection({
  title,
  subtitle,
  emptyLabel,
  members,
  unassigned,
  addLabel,
  assignTitle,
  noneLeftLabel,
  hideEmail = false,
  onAdd,
  onRemove,
}) {
```

In the members map, wrap the member email span:

```jsx
              <span className="th-rel-meta">
                <span className="th-rel-name">{member.displayName || 'No name'}</span>
                {!hideEmail && <span className="th-rel-email">{member.email}</span>}
              </span>
```

In the `unassigned` map (inside the assigning block), wrap the person email span:

```jsx
                  <span className="th-rel-meta">
                    <span className="th-rel-name">{person.displayName || 'Uten navn'}</span>
                    {!hideEmail && <span className="th-rel-email">{person.email}</span>}
                  </span>
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/components/UserManagement/RelationshipSection.test.jsx`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add src/components/UserManagement/RelationshipSection.jsx src/components/UserManagement/RelationshipSection.test.jsx
git commit -m "feat: hideEmail prop on RelationshipSection"
```

---

## Task 3: MyCoaches container

**Files:**
- Create: `src/components/MyCoaches/index.jsx`
- Test: `src/components/MyCoaches/MyCoaches.test.jsx`

**Behavior:** Subscribe to `onRelationshipsSnapshot` + `onCoachesSnapshot`. Derive `myCoaches` (coaches linked where `athleteId === currentUser.uid`) and `unassigned` (active coaches not linked and not self). Render one `RelationshipSection` with `hideEmail`. Add → `addRelationship(coachId, currentUser.uid)`. Remove → confirm, then `removeRelationship(coachId, currentUser.uid)`.

- [ ] **Step 1: Write the failing test**

Create `src/components/MyCoaches/MyCoaches.test.jsx`:

```jsx
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'

const addRelationship = vi.fn(() => Promise.resolve())
const removeRelationship = vi.fn(() => Promise.resolve())
let relCb, coachCb

vi.mock('../../userService', () => ({
  addRelationship: (...a) => addRelationship(...a),
  removeRelationship: (...a) => removeRelationship(...a),
  onRelationshipsSnapshot: (cb) => { relCb = cb; return () => {} },
  onCoachesSnapshot: (cb) => { coachCb = cb; return () => {} },
}))

// Render PageShell children directly; stub nav context.
vi.mock('../ui', async () => {
  const actual = await vi.importActual('../ui')
  return {
    ...actual,
    PageShell: ({ children }) => <div>{children}</div>,
    ShellBrand: ({ title }) => <h1>{title}</h1>,
  }
})
vi.mock('../../App/primaryNav', () => ({ useNav: () => ({ items: [], onChange: vi.fn() }) }))

import MyCoaches from './index'

const me = { uid: 'a1', displayName: 'Athlete One', email: 'a1@x.com' }

function seed() {
  coachCb([
    { uid: 'c1', displayName: 'Coach One', email: 'c1@x.com', roles: ['coach'], status: 'active' },
    { uid: 'c2', displayName: 'Coach Two', email: 'c2@x.com', roles: ['coach'], status: 'active' },
  ])
  relCb([{ id: 'c1_a1', coachId: 'c1', athleteId: 'a1' }])
}

describe('MyCoaches', () => {
  beforeEach(() => { addRelationship.mockClear(); removeRelationship.mockClear() })

  it('lists current coaches (names only) and adds a coach', () => {
    render(<MyCoaches currentUser={me} onBack={vi.fn()} />)
    seed()

    // current coach shown by name, no email
    expect(screen.getByText('Coach One')).toBeInTheDocument()
    expect(screen.queryByText('c1@x.com')).not.toBeInTheDocument()

    // open the add list and pick the unassigned coach
    fireEvent.click(screen.getByText('Add coach'))
    fireEvent.click(screen.getByText('Coach Two'))
    expect(addRelationship).toHaveBeenCalledWith('c2', 'a1')
  })

  it('removes a coach with confirmation', () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    render(<MyCoaches currentUser={me} onBack={vi.fn()} />)
    seed()

    fireEvent.click(screen.getByLabelText(/Remove link to Coach One/i))
    expect(removeRelationship).toHaveBeenCalledWith('c1', 'a1')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/components/MyCoaches/MyCoaches.test.jsx`
Expected: FAIL — module `./index` does not exist.

- [ ] **Step 3: Implement the container**

Create `src/components/MyCoaches/index.jsx`:

```jsx
import { useEffect, useMemo, useState } from 'react'
import {
  addRelationship,
  removeRelationship,
  onRelationshipsSnapshot,
  onCoachesSnapshot,
} from '../../userService'
import { Page, PageShell, ShellBrand } from '../ui'
import { useNav } from '../../App/primaryNav'
import RelationshipSection from '../UserManagement/RelationshipSection'

export default function MyCoaches({ currentUser, onBack }) {
  const nav = useNav()
  const [coaches, setCoaches] = useState([])
  const [relationships, setRelationships] = useState([])

  useEffect(() => {
    const unsubCoaches = onCoachesSnapshot(setCoaches)
    const unsubRels = onRelationshipsSnapshot(setRelationships)
    return () => { unsubCoaches(); unsubRels() }
  }, [])

  const myCoaches = useMemo(() => {
    const coachIds = new Set(
      relationships.filter(r => r.athleteId === currentUser.uid).map(r => r.coachId)
    )
    return coaches.filter(c => coachIds.has(c.uid))
  }, [relationships, coaches, currentUser.uid])

  const unassigned = useMemo(
    () => coaches.filter(
      c => c.uid !== currentUser.uid && !myCoaches.some(mc => mc.uid === c.uid)
    ),
    [coaches, myCoaches, currentUser.uid]
  )

  async function handleAdd(coach) {
    try {
      await addRelationship(coach.uid, currentUser.uid)
    } catch (err) {
      window.alert(`Could not add the coach: ${err.message}`)
    }
  }

  async function handleRemove(coach) {
    if (!window.confirm('Remove this coach?')) return
    try {
      await removeRelationship(coach.uid, currentUser.uid)
    } catch (err) {
      window.alert(`Could not remove the coach: ${err.message}`)
    }
  }

  return (
    <PageShell
      brand={<ShellBrand onBack={onBack} eyebrow="My account" title="My coaches" />}
      nav={nav?.items}
      navActive={null}
      onNavChange={nav?.onChange}
      account={nav?.account}
      selectedAthlete={nav?.selectedAthlete}
    >
      <Page>
        <RelationshipSection
          title="My coaches"
          subtitle="Coaches who follow up your training."
          emptyLabel="You haven't added a coach yet."
          members={myCoaches}
          unassigned={unassigned}
          hideEmail
          addLabel="Add coach"
          assignTitle="Select a coach to add"
          noneLeftLabel="No more coaches available."
          onAdd={handleAdd}
          onRemove={handleRemove}
        />
      </Page>
    </PageShell>
  )
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/components/MyCoaches/MyCoaches.test.jsx`
Expected: PASS (2 tests). If `Page`/`PageShell`/`ShellBrand` are not all exported from `../ui`, check `src/components/ui/index.*` and adjust imports to match the real export names (they are used identically in `src/components/UserManagement/UserDetail.jsx`).

- [ ] **Step 5: Commit**

```bash
git add src/components/MyCoaches/index.jsx src/components/MyCoaches/MyCoaches.test.jsx
git commit -m "feat: MyCoaches container — athlete self-service coach picker"
```

---

## Task 4: Wire `showMyAccount` toggle through App + screen + routes

**Files:**
- Modify: `src/App/index.jsx`
- Modify: `src/App/AdminScreens.jsx`
- Modify: `src/App/AppRoutes.jsx`

No new test — this is wiring verified by the build and a manual run.

- [ ] **Step 1: Add the screen wrapper**

In `src/App/AdminScreens.jsx`, add the import and a wrapper:

```jsx
import MyCoaches from '../components/MyCoaches'
```

```jsx
export function MyAccountScreen({ userProfile, setShowMyAccount }) {
  return (
    <MyCoaches
      currentUser={userProfile}
      onBack={() => setShowMyAccount(false)}
    />
  )
}
```

- [ ] **Step 2: Add state in App and thread it**

In `src/App/index.jsx`, after the `showUserManagement` state line (`:29`), add:

```jsx
  const [showMyAccount, setShowMyAccount] = useState(false)
```

Add `showMyAccount` to the `isModalOpen` boolean group (the block at `:119-126`):

```jsx
  const isModalOpen = Boolean(
    selectedWorkout ||
    replacementTarget ||
    showLogin ||
    showAdmin ||
    showUserManagement ||
    showMyAccount ||
    showAthleteOverview
  )
```

Pass `setShowMyAccount` into `NavProvider` (the `<NavProvider …>` block at `:187`):

```jsx
      setShowMyAccount={setShowMyAccount}
```

Pass `isAthlete`, `showMyAccount`, `setShowMyAccount`, and a `MyAccountScreen`-capable prop into `AppRoutes` (the `<AppRoutes …>` block at `:199`):

```jsx
        isAthlete={isAthlete}
        showMyAccount={showMyAccount}
        setShowMyAccount={setShowMyAccount}
```

Add `setShowMyAccount` to `handlers` creation call args at `:140` so the nav can reset other toggles consistently is NOT required — `goPlan` already resets the others; MyAccount is opened directly. Skip.

`isAthlete` is already defined at `src/App/index.jsx:60`.

- [ ] **Step 3: Add the route branch**

In `src/App/AppRoutes.jsx`:

Add to the import from `./AdminScreens`:

```jsx
import {
  UserManagementScreen,
  AthleteOverviewScreen,
  AdminDashboardScreen,
  MyAccountScreen,
} from './AdminScreens'
```

Add the new params to the function signature (alongside `showUserManagement` etc.):

```jsx
  isAthlete,
  showMyAccount,
  setShowMyAccount,
```

Add the branch BEFORE the `showAdmin` branch and before `return <MainShell …>`, but it is open to all roles — gate on `isAthlete`:

```jsx
  if (showMyAccount && isAthlete) {
    return (
      <MyAccountScreen
        userProfile={userProfile}
        setShowMyAccount={setShowMyAccount}
      />
    )
  }
```

- [ ] **Step 4: Verify build**

Run: `npx vite build`
Expected: build succeeds with no errors referencing `showMyAccount`, `MyAccountScreen`, or `MyCoaches`.

- [ ] **Step 5: Commit**

```bash
git add src/App/index.jsx src/App/AdminScreens.jsx src/App/AppRoutes.jsx
git commit -m "feat: wire showMyAccount toggle to MyCoaches screen"
```

---

## Task 5: Make the account block open MyCoaches (for athletes)

**Files:**
- Modify: `src/App/primaryNav.jsx`

The account block (`:180-203`) currently is meta + logout. Make the meta area a button that opens MyCoaches when the user is an athlete. The logout button must remain a separate click target.

- [ ] **Step 1: Accept the new props in NavProvider**

In `src/App/primaryNav.jsx`, add to the `NavProvider` signature:

```jsx
  setShowMyAccount,
  isAthlete,
```

`isAthlete` must be passed from App. In `src/App/index.jsx`, add `isAthlete={isAthlete}` to the `<NavProvider …>` props block (it is defined at `:60`).

- [ ] **Step 2: Make the meta area clickable**

Replace the account meta block (`:182-191`) so that when `isAthlete`, the meta is a button:

```jsx
        {isAthlete ? (
          <button
            type="button"
            className="th-account-meta th-account-meta-button"
            onClick={() => setShowMyAccount(true)}
            aria-label="Open my coaches"
          >
            <span className="th-account-avatar" aria-hidden="true">{initials}</span>
            <div className="th-account-info">
              <span className="th-account-name">
                {userProfile?.displayName || userProfile?.email || 'User'}
              </span>
              {userProfile?.email && userProfile?.displayName && (
                <span className="th-account-email">{userProfile.email}</span>
              )}
            </div>
          </button>
        ) : (
          <div className="th-account-meta">
            <span className="th-account-avatar" aria-hidden="true">{initials}</span>
            <div className="th-account-info">
              <span className="th-account-name">
                {userProfile?.displayName || userProfile?.email || 'User'}
              </span>
              {userProfile?.email && userProfile?.displayName && (
                <span className="th-account-email">{userProfile.email}</span>
              )}
            </div>
          </div>
        )}
```

- [ ] **Step 3: Add `setShowMyAccount`/`isAthlete` to the useMemo dep array**

Add `setShowMyAccount` and `isAthlete` to the dependency array of the `value` useMemo (the array near the end of `NavProvider`).

- [ ] **Step 4: Style the button reset**

In the nav stylesheet (find with `grep -rl "th-account-meta" src --include="*.css"`), add a reset so the button looks like the div:

```css
.th-account-meta-button {
  display: flex;
  align-items: center;
  gap: inherit;
  width: 100%;
  background: none;
  border: none;
  padding: 0;
  margin: 0;
  font: inherit;
  color: inherit;
  text-align: left;
  cursor: pointer;
}
.th-account-meta-button:hover .th-account-name {
  text-decoration: underline;
}
```

(Match `gap` to whatever `.th-account-meta` uses; if it's a specific value, copy that value rather than `inherit`.)

- [ ] **Step 5: Verify build**

Run: `npx vite build`
Expected: succeeds.

- [ ] **Step 6: Commit**

```bash
git add src/App/primaryNav.jsx src/App/index.jsx <the css file>
git commit -m "feat: athlete account block opens My coaches"
```

---

## Task 6: Firestore rules — athlete reads coaches + writes own links

**Files:**
- Modify: `firestore.rules`

- [ ] **Step 1: Allow athletes to read coach docs**

In `firestore.rules`, the `match /users/{userId}` read rule (`:101-105`) becomes:

```
      allow read: if signedIn() && (
        request.auth.uid == userId ||
        isSuperadmin() ||
        (hasRole('coach') && isCoachOf(userId)) ||
        (isActiveUser() && 'coach' in resource.data.roles)
      );
```

- [ ] **Step 2: Allow athletes to write their own relationship links**

The `match /relationships/{relationshipId}` block (`:119-130`) create/update/delete becomes:

```
      allow create, update: if isActiveUser()
        && (isSuperadmin() || request.auth.uid == request.resource.data.athleteId)
        && request.resource.data.coachId is string
        && request.resource.data.athleteId is string
        && relationshipId == request.resource.data.coachId + '_' + request.resource.data.athleteId;
      allow delete: if isActiveUser()
        && (isSuperadmin() || resource.data.athleteId == request.auth.uid);
```

- [ ] **Step 3: Verify rules compile (if firebase CLI available)**

Run: `npx firebase deploy --only firestore:rules --dry-run` (or `firebase emulators:exec`).
Expected: rules compile. If the firebase CLI is unavailable in this environment, note that and rely on manual review — the syntax matches existing rules in the file.

- [ ] **Step 4: Commit**

```bash
git add firestore.rules
git commit -m "feat: athletes can read coaches and manage own coach links"
```

---

## Task 7: Full test + build pass

- [ ] **Step 1: Run the full test suite**

Run: `npx vitest run`
Expected: all tests pass, including the three new files.

- [ ] **Step 2: Build**

Run: `npx vite build`
Expected: success.

- [ ] **Step 3: Manual verification (per superpowers:verification-before-completion)**

Run `npm run dev`, sign in as an athlete, click the account block in the sidebar → "My coaches" page opens. Add a coach (names only, no emails), confirm it appears under "My coaches". Remove it (confirm dialog). Sign in as a coach/superadmin and confirm the account block is NOT clickable for them and admin Users still works unchanged.

---

## Self-review notes

- **Spec coverage:** account-block entry (Task 5), athlete-only page (Task 4 gate on `isAthlete`), names-only via `hideEmail` (Tasks 2+3), add+remove (Task 3), `onCoachesSnapshot` (Task 1), two rule changes + caveat (Task 6). All covered.
- **Type/name consistency:** `onCoachesSnapshot`, `hideEmail`, `showMyAccount`/`setShowMyAccount`, `MyAccountScreen`, `MyCoaches` used identically across tasks.
- **Caveat carried forward:** Task 6 keeps the accepted DB-level email exposure; UI enforces names-only.
