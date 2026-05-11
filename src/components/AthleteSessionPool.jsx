import { useEffect, useMemo, useState } from 'react'
import { collection, onSnapshot, query, where } from 'firebase/firestore'
import { db } from '../firebase'
import { mergeTemplates } from '../templateLibrary'
import {
  subscribeAthleteSessions,
  addAthleteSessionFromBank,
  updateAthleteSession,
  deleteAthleteSession,
} from '../athleteSessions'
import {
  Button,
  IconButton,
  Modal,
  Field,
  Input,
  Textarea,
  Select,
  TemplateCard,
  Card,
  EmptyState,
  Badge,
} from './ui'
import SystemIcon from './SystemIcon'
import SessionEditor from './SessionEditor'
import { ACTIVITY_TAGS, WORKOUT_TYPES } from '../utils'
import {
  computeSessionTotals,
  formatDistance,
  formatDuration,
  hasStructuredBlocks,
} from '../sessionBlocks'
import './AthleteSessionPool.css'

export default function AthleteSessionPool({ coachId, athleteId }) {
  const [sessions, setSessions] = useState([])
  const [bankTemplates, setBankTemplates] = useState([])
  const [pickerOpen, setPickerOpen] = useState(false)
  const [editing, setEditing] = useState(null)

  useEffect(() => {
    if (!coachId || !athleteId) return
    return subscribeAthleteSessions(coachId, athleteId, setSessions)
  }, [coachId, athleteId])

  // Coach's own bank ("templates" with ownerId = coachId), merged with builtin.
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

function PoolSessionCard({ session, onEdit, onDelete }) {
  const totals = hasStructuredBlocks(session)
    ? computeSessionTotals(session.blocks, session.activityTag)
    : { totalDuration: 0, totalDistance: 0 }
  return (
    <Card className="tp-pool-card">
      <div className="tp-pool-card-main">
        <div className="tp-pool-card-titles">
          <h4 className="tp-pool-card-title">{session.title}</h4>
          <div className="tp-pool-card-meta">
            {session.category && <Badge>{session.category}</Badge>}
            {hasStructuredBlocks(session) && (
              <>
                <span className="tp-pool-card-stat">{formatDuration(totals.totalDuration)}</span>
                <span className="tp-pool-card-stat">{formatDistance(totals.totalDistance)}</span>
              </>
            )}
          </div>
          {session.description && (
            <p className="tp-pool-card-desc">{session.description}</p>
          )}
        </div>
      </div>
      <div className="tp-pool-card-actions">
        <IconButton ariaLabel="Rediger" onClick={onEdit}>
          <SystemIcon name="edit" className="system-icon" />
        </IconButton>
        <IconButton ariaLabel="Slett" onClick={onDelete}>
          <SystemIcon name="delete" className="system-icon" />
        </IconButton>
      </div>
    </Card>
  )
}

function BankPickerModal({ bankTemplates, onClose, onPick }) {
  const [search, setSearch] = useState('')
  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase()
    if (!term) return bankTemplates
    return bankTemplates.filter(t =>
      (t.title || '').toLowerCase().includes(term) ||
      (t.category || '').toLowerCase().includes(term) ||
      (t.description || '').toLowerCase().includes(term),
    )
  }, [bankTemplates, search])

  return (
    <Modal
      open
      onClose={onClose}
      eyebrow="Øktbank"
      title="Velg økt fra banken"
      size="lg"
    >
      <div className="tp-pool-picker">
        <Input
          type="search"
          placeholder="Søk i banken…"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        {filtered.length === 0 ? (
          <EmptyState title="Ingen treff" description="Prøv å justere søket." />
        ) : (
          <div className="tp-pool-picker-grid">
            {filtered.map(template => (
              <TemplateCard
                key={template.id}
                template={template}
                primaryLabel="Legg til"
                onPrimary={() => onPick(template)}
              />
            ))}
          </div>
        )}
      </div>
    </Modal>
  )
}

function SessionEditModal({ session, onClose, onSave }) {
  const [draft, setDraft] = useState(() => ({ ...session }))

  function patch(key, value) {
    setDraft(prev => ({ ...prev, [key]: value }))
  }

  return (
    <Modal
      open
      onClose={onClose}
      eyebrow="Rediger økt"
      title={draft.title || 'Ny økt'}
      size="lg"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Avbryt</Button>
          <Button onClick={() => onSave(draft)}>Lagre</Button>
        </>
      }
    >
      <div className="tp-pool-edit">
        <div className="tp-pool-edit-grid">
          <Field label="Tittel">
            <Input value={draft.title || ''} onChange={e => patch('title', e.target.value)} />
          </Field>
          <Field label="Type">
            <Select value={draft.type || ''} onChange={e => patch('type', e.target.value)}>
              {WORKOUT_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
            </Select>
          </Field>
          <Field label="Aktivitet">
            <Select value={draft.activityTag || ''} onChange={e => patch('activityTag', e.target.value)}>
              <option value="">Velg aktivitet</option>
              {ACTIVITY_TAGS.map(tag => (
                <option key={tag.value} value={tag.value}>{tag.label}</option>
              ))}
            </Select>
          </Field>
        </div>

        <Field label="Beskrivelse">
          <Textarea
            rows={2}
            value={draft.description || ''}
            onChange={e => patch('description', e.target.value)}
          />
        </Field>

        <SessionEditor
          value={draft.blocks}
          activityTag={draft.activityTag}
          workoutType={draft.type === 'interval' || draft.type === 'terskel' ? 'interval' : 'continuous'}
          onChange={(blocks) => patch('blocks', blocks)}
        />

        <Field label="Notater">
          <Textarea
            rows={2}
            value={draft.notes || ''}
            onChange={e => patch('notes', e.target.value)}
          />
        </Field>
      </div>
    </Modal>
  )
}
