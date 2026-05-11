import { useEffect, useState } from 'react'
import { collection, onSnapshot, query, where } from 'firebase/firestore'
import { db } from '../../firebase'
import { mergeTemplates } from '../../templateLibrary'
import {
  subscribeAthleteSessions,
  addAthleteSessionFromBank,
  updateAthleteSession,
  deleteAthleteSession,
} from '../../athleteSessions'
import { Button, EmptyState } from '../ui'
import PoolSessionCard from './PoolSessionCard'
import BankPickerModal from './BankPickerModal'
import SessionEditModal from './SessionEditModal'
import '../AthleteSessionPool.css'

export default function AthleteSessionPool({ coachId, athleteId }) {
  const [sessions, setSessions] = useState([])
  const [bankTemplates, setBankTemplates] = useState([])
  const [pickerOpen, setPickerOpen] = useState(false)
  const [editing, setEditing] = useState(null)

  useEffect(() => {
    if (!coachId || !athleteId) return
    return subscribeAthleteSessions(coachId, athleteId, setSessions)
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
    )
    return unsub
  }, [coachId])

  async function handleAddFromBank(template) {
    await addAthleteSessionFromBank(coachId, athleteId, template)
    setPickerOpen(false)
  }

  async function handleEditSave(updated) {
    await updateAthleteSession(updated.id, updated)
    setEditing(null)
  }

  async function handleDelete(session) {
    if (!window.confirm(`Slette økten «${session.title}»?`)) return
    await deleteAthleteSession(session.id)
  }

  return (
    <div className="tp-athlete-pool">
      <div className="tp-athlete-pool-head">
        <span className="tp-athlete-pool-count">
          {sessions.length} økt{sessions.length === 1 ? '' : 'er'} i banken
        </span>
        <Button size="sm" onClick={() => setPickerOpen(true)}>
          + Legg til fra bank
        </Button>
      </div>

      {sessions.length === 0 ? (
        <EmptyState
          title="Ingen økter ennå"
          description="Hent inn økter fra trenerens øktbank for å bygge utøverens personlige bibliotek."
        />
      ) : (
        <div className="tp-athlete-pool-list">
          {sessions.map(session => (
            <PoolSessionCard
              key={session.id}
              session={session}
              onEdit={() => setEditing(session)}
              onDelete={() => handleDelete(session)}
            />
          ))}
        </div>
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
