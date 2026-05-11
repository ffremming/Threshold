import { useState } from 'react'
import { Button, Field, Input, Modal, Select, Textarea } from '../ui'
import SessionEditor from '../SessionEditor'
import { ACTIVITY_TAGS, WORKOUT_TYPES } from '../../utils'

export default function SessionEditModal({ session, onClose, onSave }) {
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
