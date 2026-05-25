import { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { ChevronRight } from 'lucide-react'
import SystemIcon from '../components/SystemIcon'
import { Button } from '../components/ui'

/* ────────────────────────────────────────────────────────────────────
 * Primary nav — single source of truth for the sidebar.
 *
 * Provides via context:
 *   • items / onChange / account  → primary nav + account block
 *   • selectedAthlete             → contextual "valgt utøver" block,
 *                                    rendered in the sidebar between
 *                                    the nav list and the account block.
 *                                    Clickable; opens a popover with the
 *                                    full athlete roster.
 * ──────────────────────────────────────────────────────────────────── */
const NavContext = createContext(null)

function initialOf(p) {
  return ((p?.displayName || p?.email || '?').trim()[0] || '?').toUpperCase()
}

function SidebarAthlete({
  athletes,
  selectedAthleteId,
  setSelectedAthleteId,
  userProfile,
  isSuperadmin,
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  // Close on outside click + Escape
  useEffect(() => {
    if (!open) return
    function onDocClick(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    function onKey(e) {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onDocClick)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDocClick)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  // Self-include — coaches can plan for themselves; superadmins also see their
  // own profile as a valid context.
  const includeSelf = isSuperadmin || athletes.some(a => a.uid === userProfile?.uid)
  const visibleAthletes = useMemo(() => {
    const list = athletes.filter(a => a.uid !== userProfile?.uid)
    return includeSelf && userProfile ? [userProfile, ...list] : list
  }, [athletes, userProfile, includeSelf])

  const selected = visibleAthletes.find(a => a.uid === selectedAthleteId) || null
  const displayName = selected
    ? (selected.uid === userProfile?.uid ? `${selected.displayName} (meg)` : selected.displayName)
    : 'Velg utøver'

  return (
    <div className="tp-sb-athlete" ref={ref}>
      <button
        type="button"
        className={`tp-sb-athlete-trigger${open ? ' is-open' : ''}`}
        onClick={() => setOpen(v => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span className="tp-sb-athlete-avatar" aria-hidden="true">
          {initialOf(selected)}
        </span>
        <span className="tp-sb-athlete-meta">
          <span className="tp-sb-athlete-eyebrow">Valgt utøver</span>
          <span className="tp-sb-athlete-name">{displayName}</span>
        </span>
        <ChevronRight
          className={`tp-sb-athlete-chevron${open ? ' is-open' : ''}`}
          size={16}
          aria-hidden="true"
        />
      </button>

      {open && (
        <div className="tp-sb-athlete-popover" role="listbox" aria-label="Bytt utøver">
          <div className="tp-sb-athlete-popover-head">
            <span className="tp-sb-athlete-eyebrow">Utøvere</span>
          </div>
          <ul className="tp-sb-athlete-popover-list">
            {visibleAthletes.length === 0 && (
              <li className="tp-sb-athlete-popover-empty">Ingen utøvere</li>
            )}
            {visibleAthletes.map(a => {
              const isActive = a.uid === selectedAthleteId
              const isSelf = a.uid === userProfile?.uid
              return (
                <li key={a.uid}>
                  <button
                    type="button"
                    role="option"
                    aria-selected={isActive}
                    className={`tp-sb-athlete-option${isActive ? ' is-active' : ''}`}
                    onClick={() => {
                      setSelectedAthleteId(a.uid)
                      setOpen(false)
                    }}
                  >
                    <span className="tp-sb-athlete-option-avatar" aria-hidden="true">
                      {initialOf(a)}
                    </span>
                    <span className="tp-sb-athlete-option-name">
                      {isSelf ? `${a.displayName} (meg)` : (a.displayName || a.email || 'Uten navn')}
                    </span>
                    {isActive && <span className="tp-sb-athlete-option-dot" aria-hidden="true" />}
                  </button>
                </li>
              )
            })}
          </ul>
        </div>
      )}
    </div>
  )
}

export function NavProvider({
  canManageWorkouts,
  isSuperadmin,
  setShowAthleteOverview,
  setShowAdmin,
  setShowUserManagement,
  handleLogout,
  userProfile,
  athletes,
  selectedAthleteId,
  setSelectedAthleteId,
  children,
}) {
  const value = useMemo(() => {
    const goPlan = () => {
      setShowAthleteOverview(false)
      setShowAdmin(false)
      setShowUserManagement(false)
    }

    const items = [
      {
        key: 'plan',
        label: 'Plan',
        icon: <SystemIcon name="calendar" />,
        onSelect: goPlan,
      },
      canManageWorkouts && {
        key: 'athletes',
        label: 'Utøvere',
        icon: <SystemIcon name="users" />,
        onSelect: () => { goPlan(); setShowAthleteOverview(true) },
      },
      canManageWorkouts && {
        key: 'admin',
        label: 'Trenerpanel',
        icon: <SystemIcon name="dashboard" />,
        onSelect: () => { goPlan(); setShowAdmin(true) },
      },
      isSuperadmin && {
        key: 'users',
        label: 'Brukere',
        icon: <SystemIcon name="settings" />,
        onSelect: () => { goPlan(); setShowUserManagement(true) },
      },
    ].filter(Boolean)

    const onChange = (key) => {
      items.find(item => item.key === key)?.onSelect?.()
    }

    const initials = (userProfile?.displayName || userProfile?.email || '?').slice(0, 1).toUpperCase()
    const account = (
      <div className="tp-account">
        <div className="tp-account-meta">
          <span className="tp-account-avatar" aria-hidden="true">{initials}</span>
          <div className="tp-account-info">
            <span className="tp-account-name">
              {userProfile?.displayName || userProfile?.email || 'Bruker'}
            </span>
            {userProfile?.email && userProfile?.displayName && (
              <span className="tp-account-email">{userProfile.email}</span>
            )}
          </div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          block
          onClick={handleLogout}
          className="tp-account-logout"
        >
          <SystemIcon name="logout" className="button-icon" />
          Logg ut
        </Button>
      </div>
    )

    const showAthleteBlock = canManageWorkouts && (athletes?.length || 0) > 0
    const selectedAthlete = showAthleteBlock ? (
      <SidebarAthlete
        athletes={athletes}
        selectedAthleteId={selectedAthleteId}
        setSelectedAthleteId={setSelectedAthleteId}
        userProfile={userProfile}
        isSuperadmin={isSuperadmin}
      />
    ) : null

    return { items, onChange, account, selectedAthlete }
  }, [
    canManageWorkouts,
    isSuperadmin,
    setShowAthleteOverview,
    setShowAdmin,
    setShowUserManagement,
    handleLogout,
    userProfile,
    athletes,
    selectedAthleteId,
    setSelectedAthleteId,
  ])

  return <NavContext.Provider value={value}>{children}</NavContext.Provider>
}

/* Returns { items, onChange, account, selectedAthlete } — or `null` if no
 * provider is mounted (e.g. on the Login screen). Callers should guard. */
export function useNav() {
  return useContext(NavContext)
}
