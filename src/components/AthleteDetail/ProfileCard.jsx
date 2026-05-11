import { useEffect, useState } from 'react'
import { updateAthleteMaxHr, updateAthleteZones } from '../../userService'
import { Button, Card, Field, Input } from '../ui'

export default function ProfileCard({ profile }) {
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
