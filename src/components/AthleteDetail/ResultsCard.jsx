import { useState } from 'react'
import { Trash2 } from 'lucide-react'
import { addAthleteResult, removeAthleteResult } from '../../userService'
import { Badge, Button, Card, Field, IconButton, Input } from '../ui'

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
    } catch (err) {
      window.alert(`Could not save the result: ${err.message}`)
    } finally {
      setAdding(false)
    }
  }

  async function handleRemove(entry) {
    if (!profile?.uid) return
    if (!window.confirm('Delete this result?')) return
    try {
      await removeAthleteResult(profile.uid, entry)
    } catch (err) {
      window.alert(`Could not delete the result: ${err.message}`)
    }
  }

  const sorted = [...results].sort((a, b) => (b.date || '').localeCompare(a.date || ''))

  return (
    <Card className="th-athlete-results">
      <div className="th-athlete-results-form">
        <Field label="Date">
          <Input type="date" value={date} onChange={e => setDate(e.target.value)} />
        </Field>
        <Field label="Distance">
          <Input value={distance} onChange={e => setDistance(e.target.value)} placeholder="e.g. 10 km" />
        </Field>
        <Field label="Time">
          <Input value={time} onChange={e => setTime(e.target.value)} placeholder="e.g. 38:42" />
        </Field>
        <Field label="Note">
          <Input value={note} onChange={e => setNote(e.target.value)} placeholder="optional" />
        </Field>
        <div className="th-athlete-results-form-actions">
          <Button onClick={handleAdd} disabled={adding || !distance.trim() || !time.trim()}>
            {adding ? 'Adding…' : 'Add'}
          </Button>
        </div>
      </div>

      {sorted.length === 0 ? (
        <p className="th-athlete-results-empty">No results logged yet.</p>
      ) : (
        <ul className="th-athlete-results-list">
          {sorted.map((entry, idx) => (
            <li key={`${entry.date}-${entry.distance}-${entry.time}-${idx}`} className="th-athlete-result-row">
              <div className="th-athlete-result-main">
                <Badge>{entry.date}</Badge>
                <span className="th-athlete-result-dist">{entry.distance}</span>
                <span className="th-athlete-result-time">{entry.time}</span>
                {entry.note && <span className="th-athlete-result-note">{entry.note}</span>}
              </div>
              <IconButton ariaLabel="Delete result" onClick={() => handleRemove(entry)}>
                <Trash2 size={16} aria-hidden="true" />
              </IconButton>
            </li>
          ))}
        </ul>
      )}
    </Card>
  )
}
