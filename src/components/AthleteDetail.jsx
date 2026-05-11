import { useEffect, useState } from 'react'
import {
  onUserProfileSnapshot,
  updateAthleteMaxHr,
  updateAthleteZones,
  addAthleteResult,
  removeAthleteResult,
} from '../userService'
import {
  Button,
  IconButton,
  PageShell,
  ShellBrand,
  Page,
  Section,
  Card,
  Field,
  Input,
  Badge,
} from './ui'
import SystemIcon from './SystemIcon'
import AthleteSessionPool from './AthleteSessionPool'
import './AthleteDetail.css'

export default function AthleteDetail({ athlete, coach, onBack }) {
  const [profile, setProfile] = useState(athlete)

  useEffect(() => {
    if (!athlete?.uid) return
    return onUserProfileSnapshot(athlete.uid, p => p && setProfile(p))
  }, [athlete?.uid])

  return (
    <PageShell
      brand={
        <ShellBrand
          eyebrow="Utøver"
          title={profile?.displayName || profile?.email || 'Utøver'}
        />
      }
      actions={
        <Button variant="ghost" size="sm" onClick={onBack}>
          <span aria-hidden="true">‹</span> Tilbake
        </Button>
      }
    >
      <Page>
        <Section
          title="Profil & soner"
          subtitle="Maks HR og terskel-tempo brukes til å forme treningssoner"
        >
          <ProfileCard profile={profile} />
        </Section>

        <Section
          title="Resultater"
          subtitle="Logg distanse og tid fra konkurranser og tester"
        >
          <ResultsCard profile={profile} />
        </Section>

        <Section
          title="Øktbank for utøver"
          subtitle="Egne økter for denne utøveren. Endringer her påvirker ikke trenerens bank."
        >
          <AthleteSessionPool
            coachId={coach?.uid}
            athleteId={profile?.uid}
          />
        </Section>
      </Page>
    </PageShell>
  )
}

function ProfileCard({ profile }) {
  const [maxHr, setMaxHr] = useState('')
  const [thresholdHr, setThresholdHr] = useState('')
  const [vo2maxHr, setVo2maxHr] = useState('')
  const [easyTempo, setEasyTempo] = useState('')
  const [longTempo, setLongTempo] = useState('')
  const [dirty, setDirty] = useState(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!profile) return
    setMaxHr(profile.maxHr ?? '')
    setThresholdHr(profile.thresholdHr ?? '')
    setVo2maxHr(profile.vo2maxHr ?? '')
    setEasyTempo(profile.easyTempo ?? '')
    setLongTempo(profile.longTempo ?? '')
    setDirty(false)
  }, [profile?.uid, profile?.maxHr, profile?.thresholdHr, profile?.vo2maxHr, profile?.easyTempo, profile?.longTempo])

  async function handleSave() {
    if (!profile?.uid) return
    setSaving(true)
    try {
      await Promise.all([
        updateAthleteMaxHr(profile.uid, maxHr),
        updateAthleteZones(profile.uid, { thresholdHr, vo2maxHr, easyTempo, longTempo }),
      ])
      setDirty(false)
    } finally {
      setSaving(false)
    }
  }

  function set(setter) {
    return (e) => {
      setter(e.target.value)
      setDirty(true)
    }
  }

  return (
    <Card className="tp-athlete-profile">
      <div className="tp-athlete-profile-grid">
        <Field label="Maks HR (slag/min)">
          <Input
            type="number"
            inputMode="numeric"
            value={maxHr}
            onChange={set(setMaxHr)}
            placeholder="f.eks. 190"
          />
        </Field>
        <Field label="Terskel HR">
          <Input
            type="number"
            inputMode="numeric"
            value={thresholdHr}
            onChange={set(setThresholdHr)}
            placeholder="f.eks. 175"
          />
        </Field>
        <Field label="VO2max HR">
          <Input
            type="number"
            inputMode="numeric"
            value={vo2maxHr}
            onChange={set(setVo2maxHr)}
            placeholder="f.eks. 185"
          />
        </Field>
        <Field label="Rolig tempo">
          <Input
            value={easyTempo}
            onChange={set(setEasyTempo)}
            placeholder="f.eks. 5:30 /km"
          />
        </Field>
        <Field label="Langtempo">
          <Input
            value={longTempo}
            onChange={set(setLongTempo)}
            placeholder="f.eks. 4:30 /km"
          />
        </Field>
      </div>
      <div className="tp-athlete-profile-actions">
        <Button onClick={handleSave} disabled={!dirty || saving}>
          {saving ? 'Lagrer…' : 'Lagre'}
        </Button>
      </div>
    </Card>
  )
}

function ResultsCard({ profile }) {
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
