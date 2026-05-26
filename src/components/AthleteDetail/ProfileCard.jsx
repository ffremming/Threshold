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
    } catch (err) {
      window.alert(`Could not save the profile: ${err.message}`)
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
        <Field label="Max HR (bpm)">
          <Input
            type="number"
            inputMode="numeric"
            value={maxHr}
            onChange={set(setMaxHr)}
            placeholder="e.g. 190"
          />
        </Field>
        <Field label="Threshold HR">
          <Input
            type="number"
            inputMode="numeric"
            value={thresholdHr}
            onChange={set(setThresholdHr)}
            placeholder="e.g. 175"
          />
        </Field>
        <Field label="VO2max HR">
          <Input
            type="number"
            inputMode="numeric"
            value={vo2maxHr}
            onChange={set(setVo2maxHr)}
            placeholder="e.g. 185"
          />
        </Field>
        <Field label="Easy pace">
          <Input
            value={easyTempo}
            onChange={set(setEasyTempo)}
            placeholder="e.g. 5:30 /km"
          />
        </Field>
        <Field label="Long pace">
          <Input
            value={longTempo}
            onChange={set(setLongTempo)}
            placeholder="e.g. 4:30 /km"
          />
        </Field>
      </div>
      <div className="tp-athlete-profile-actions">
        <Button onClick={handleSave} disabled={!dirty || saving}>
          {saving ? 'Saving…' : 'Save'}
        </Button>
      </div>
    </Card>
  )
}
