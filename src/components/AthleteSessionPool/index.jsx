import { useEffect, useMemo, useState } from 'react'
import { Plus } from 'lucide-react'
import { collection, onSnapshot, query, where } from 'firebase/firestore'
import { db } from '../../firebase'
import { isRateLimitError } from '../../security/rateLimits'
import { mergeTemplates } from '../../templateLibrary'
import {
  subscribeAthleteSessions,
  addAthleteSessionFromBank,
  updateAthleteSession,
  deleteAthleteSession,
} from '../../athleteSessions'
import { Button, EmptyState, SessionFilterBar, TemplateCard } from '../ui'
import { useSessionFilters } from '../../App/hooks/useSessionFilters'
import { makeMuscleResolver } from '../dimensions/useMuscleResolver'
import BankPickerModal from './BankPickerModal'
import SessionEditModal from './SessionEditModal'
import '../AthleteSessionPool.css'
import '../LibraryBrowser.css'

const resolveMuscles = makeMuscleResolver()
const POOL_FILTERS = ['search', 'activities', 'zones', 'categories']

export default function AthleteSessionPool({ coachId, athleteId }) {
  const [sessions, setSessions] = useState([])
  const [bankTemplates, setBankTemplates] = useState([])
  const [pickerOpen, setPickerOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [loading, setLoading] = useState(true)

  const filters = useSessionFilters(sessions, { enabled: POOL_FILTERS, resolveMuscles })
  const sportCounts = useMemo(() => {
    const counts = new Map()
    sessions.forEach(s => {
      if (!s.activityTag) return
      counts.set(s.activityTag, (counts.get(s.activityTag) || 0) + 1)
    })
    return counts
  }, [sessions])
  const presentSportValues = useMemo(() => Array.from(sportCounts.keys()), [sportCounts])

  useEffect(() => {
    if (!coachId || !athleteId) {
      setSessions([])
      setLoading(false)
      return
    }
    setLoading(true)
    return subscribeAthleteSessions(coachId, athleteId, next => {
      setSessions(next)
      setLoading(false)
    })
  }, [coachId, athleteId])

  useEffect(() => {
    if (!coachId) {
      setBankTemplates(mergeTemplates())
      return
    }
    const unsub = onSnapshot(
      query(collection(db, 'templates'), where('ownerId', '==', coachId)),
      snap => {
        const custom = snap.docs.map(d => ({ id: d.id, ...d.data() }))
        setBankTemplates(mergeTemplates(custom))
      },
      err => {
        console.error('AthleteSessionPool templates listen error:', err)
        setBankTemplates(mergeTemplates())
      },
    )
    return unsub
  }, [coachId])

  async function handleAddFromBank(template) {
    try {
      await addAthleteSessionFromBank(coachId, athleteId, template)
      setPickerOpen(false)
    } catch (err) {
      window.alert(isRateLimitError(err) ? err.message : 'Could not add the session. Please try again.')
    }
  }

  async function handleEditSave(updated) {
    try {
      await updateAthleteSession(updated.id, updated)
      setEditing(null)
    } catch (err) {
      window.alert(isRateLimitError(err) ? err.message : 'Could not save the session. Please try again.')
    }
  }

  async function handleDelete(session) {
    if (!window.confirm(`Delete the session «${session.title}»?`)) return
    try {
      await deleteAthleteSession(session.id)
    } catch (err) {
      window.alert(isRateLimitError(err) ? err.message : 'Could not delete the session. Please try again.')
    }
  }

  return (
    <div className="th-athlete-pool">
      <div className="th-athlete-pool-head">
        <span className="th-athlete-pool-count">
          {sessions.length} session{sessions.length === 1 ? '' : 's'} in the bank
        </span>
        <Button size="sm" onClick={() => setPickerOpen(true)}>
          <Plus size={15} aria-hidden="true" />
          Add from bank
        </Button>
      </div>

      {loading ? (
        <EmptyState title="Loading sessions…" description="Fetching the athlete's personal library." />
      ) : sessions.length === 0 ? (
        <EmptyState
          title="No sessions yet"
          description="Pull in sessions from the coach's session bank to build the athlete's personal library."
        />
      ) : (
        <>
          <SessionFilterBar
            criteria={filters.criteria}
            set={filters.set}
            filtersActive={filters.filtersActive}
            clearAll={filters.clearAll}
            enabled={POOL_FILTERS}
            sportCounts={sportCounts}
            presentSportValues={presentSportValues}
            resultCount={filters.filtered.length}
          />
          {filters.filtered.length === 0 ? (
            <EmptyState title="No matches" description="Try a different search or remove a filter." />
          ) : (
            <div className="th-card-grid">
              {filters.filtered.map(session => (
                <TemplateCard
                  key={session.id}
                  template={session}
                  primaryLabel="Edit"
                  primaryVariant="secondary"
                  onPrimary={() => setEditing(session)}
                  onDelete={() => handleDelete(session)}
                />
              ))}
            </div>
          )}
        </>
      )}

      {pickerOpen && (
        <BankPickerModal
          bankTemplates={bankTemplates}
          onClose={() => setPickerOpen(false)}
          onPick={handleAddFromBank}
        />
      )}

      {editing && (
        <SessionEditModal
          session={editing}
          onClose={() => setEditing(null)}
          onSave={handleEditSave}
        />
      )}
    </div>
  )
}
