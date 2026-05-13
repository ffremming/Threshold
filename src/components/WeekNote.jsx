import { useEffect, useRef, useState } from 'react'
import { saveWeekNote } from '../weekNotes'

export default function WeekNote({ athleteId, week, year, note }) {
  const [text, setText] = useState(note?.text ?? '')
  const [status, setStatus] = useState('idle')
  const lastSavedRef = useRef(note?.text ?? '')
  const debounceRef = useRef(null)
  const savedTimerRef = useRef(null)

  useEffect(() => {
    const incoming = note?.text ?? ''
    setText(incoming)
    lastSavedRef.current = incoming
  }, [note?.text, athleteId, week, year])

  useEffect(() => () => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (savedTimerRef.current) clearTimeout(savedTimerRef.current)
  }, [])

  async function persist(value) {
    if (value === lastSavedRef.current) return
    setStatus('saving')
    try {
      await saveWeekNote({ athleteId, week, year, text: value })
      lastSavedRef.current = value
      setStatus('saved')
      if (savedTimerRef.current) clearTimeout(savedTimerRef.current)
      savedTimerRef.current = setTimeout(() => setStatus('idle'), 1500)
    } catch {
      setStatus('error')
    }
  }

  function handleChange(event) {
    const value = event.target.value
    setText(value)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => persist(value), 800)
  }

  function handleBlur() {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    persist(text)
  }

  if (!athleteId) return null

  return (
    <div className="week-note">
      <div className="week-note__header">
        <label htmlFor="week-note-textarea" className="week-note__label">Ukenotat</label>
        <span className="week-note__status" aria-live="polite">
          {status === 'saving' && 'Lagrer…'}
          {status === 'saved' && 'Lagret'}
          {status === 'error' && 'Feil ved lagring'}
        </span>
      </div>
      <textarea
        id="week-note-textarea"
        className="week-note__textarea"
        value={text}
        onChange={handleChange}
        onBlur={handleBlur}
        placeholder="Skriv et notat for uka…"
        rows={3}
      />
    </div>
  )
}
