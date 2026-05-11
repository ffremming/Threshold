import { useState } from 'react'
import { addAthleteResult, removeAthleteResult } from '../../userService'
import { Badge, Button, Card, Field, IconButton, Input } from '../ui'
import SystemIcon from '../SystemIcon'

export default function ResultsCard({ profile }) {
  const results = Array.isArray(profile?.results) ? profile.results : []
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [distance, setDistance] = useState('')
  const [time, setTime] = useState('')
  const [note, setNote] = useState('')
  const [adding, setAdding] = useState(false)

  async function handleAdd() {
    if (!profile?.uid || !distance.trim() || !time.trim()) return
    setAdding(true)
    try {
      await addAthleteResult(profile.uid, { date, distance, time, note })
      setDistance('')
      setTime('')
      setNote('')
    } finally {
      setAdding(false)
    }
  }

  async function handleRemove(entry) {
    if (!profile?.uid) return
    if (!window.confirm('Slette dette resultatet?')) return
    await removeAthleteResult(profile.uid, entry)
  }

  const sorted = [...results].sort((a, b) => (b.date || '').localeCompare(a.date || ''))

  return (
    <Card className="tp-athlete-results">
      <div className="tp-athlete-results-form">
        <Field label="Dato">
          <Input type="date" value={date} onChange={e => setDate(e.target.value)} />
        </Field>
        <Field label="Distanse">
          <Input value={distance} onChange={e => setDistance(e.target.value)} placeholder="f.eks. 10 km" />
        </Field>
        <Field label="Tid">
          <Input value={time} onChange={e => setTime(e.target.value)} placeholder="f.eks. 38:42" />
        </Field>
        <Field label="Notat">
          <Input value={note} onChange={e => setNote(e.target.value)} placeholder="valgfritt" />
        </Field>
        <div className="tp-athlete-results-form-actions">
          <Button onClick={handleAdd} disabled={adding || !distance.trim() || !time.trim()}>
            {adding ? 'Legger til…' : 'Legg til'}
          </Button>
        </div>
      </div>

      {sorted.length === 0 ? (
        <p className="tp-athlete-results-empty">Ingen resultater logget ennå.</p>
      ) : (
        <ul className="tp-athlete-results-list">
          {sorted.map((entry, idx) => (
            <li key={`${entry.date}-${entry.distance}-${entry.time}-${idx}`} className="tp-athlete-result-row">
              <div className="tp-athlete-result-main">
                <Badge>{entry.date}</Badge>
                <span className="tp-athlete-result-dist">{entry.distance}</span>
                <span className="tp-athlete-result-time">{entry.time}</span>
                {entry.note && <span className="tp-athlete-result-note">{entry.note}</span>}
              </div>
              <IconButton ariaLabel="Slett resultat" onClick={() => handleRemove(entry)}>
                <SystemIcon name="delete" className="system-icon" />
              </IconButton>
            </li>
          ))}
        </ul>
      )}
    </Card>
  )
}
