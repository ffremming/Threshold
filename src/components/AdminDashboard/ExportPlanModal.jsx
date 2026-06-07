import { useState } from 'react'
import { Modal, Button, Field, Input, Select } from '../ui'
import { EXPORT_FIELDS } from './buildPlanWorkbook'
import { usePlanExport } from './usePlanExport'
import './export-plan.css'

const ALL_KEYS = EXPORT_FIELDS.map(f => f.key)

export default function ExportPlanModal({
  open,
  onClose,
  athletes = [],
  selectedAthleteId,
  defaultStart,
  defaultEnd,
}) {
  const { status, runExport, resetStatus } = usePlanExport(athletes)

  const [athleteId, setAthleteId] = useState(selectedAthleteId || (athletes[0]?.uid ?? 'all'))
  const [startDate, setStartDate] = useState(defaultStart)
  const [endDate, setEndDate] = useState(defaultEnd)
  const [selected, setSelected] = useState(() => new Set(ALL_KEYS))

  const allChecked = selected.size === ALL_KEYS.length

  function toggleField(key) {
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
    resetStatus()
  }

  function toggleAll() {
    setSelected(allChecked ? new Set() : new Set(ALL_KEYS))
    resetStatus()
  }

  const rangeValid = startDate && endDate && startDate <= endDate
  const canExport = rangeValid && selected.size > 0 && status !== 'loading'

  async function handleExport() {
    const result = await runExport({
      athleteId,
      startDate,
      endDate,
      selectedFieldKeys: EXPORT_FIELDS.filter(f => selected.has(f.key)).map(f => f.key),
    })
    if (result.ok) onClose()
  }

  const athleteName = id => {
    const a = athletes.find(x => x.uid === id)
    return a ? (a.displayName || a.email || a.uid) : id
  }

  const footer = (
    <>
      <Button variant="secondary" onClick={onClose}>Cancel</Button>
      <Button onClick={handleExport} disabled={!canExport}>
        {status === 'loading' ? 'Gathering sessions…' : 'Export'}
      </Button>
    </>
  )

  return (
    <Modal open={open} onClose={onClose} title="Export training plan" size="lg" footer={footer}>
      <div className="export-plan-form">
        <Field label="Athlete">
          <Select value={athleteId} onChange={e => { setAthleteId(e.target.value); resetStatus() }}>
            <option value="all">All athletes</option>
            {athletes.map(a => (
              <option key={a.uid} value={a.uid}>{athleteName(a.uid)}</option>
            ))}
          </Select>
        </Field>

        <div className="export-plan-row">
          <Field label="Start date">
            <Input type="date" value={startDate} max={endDate}
              onChange={e => { setStartDate(e.target.value); resetStatus() }} />
          </Field>
          <Field label="End date">
            <Input type="date" value={endDate} min={startDate}
              onChange={e => { setEndDate(e.target.value); resetStatus() }} />
          </Field>
        </div>

        <Field label="Fields" hint={rangeValid ? undefined : 'End date must be on or after start date.'}>
          <div className="export-plan-allrow">
            <Button variant="secondary" size="sm" type="button" onClick={toggleAll}>
              {allChecked ? 'Select none' : 'Select all'}
            </Button>
          </div>
          <div className="export-plan-fields">
            {EXPORT_FIELDS.map(f => (
              <label key={f.key} className="export-plan-field">
                <input
                  type="checkbox"
                  checked={selected.has(f.key)}
                  onChange={() => toggleField(f.key)}
                />
                {f.header}
              </label>
            ))}
          </div>
        </Field>

        {status === 'empty' && (
          <div className="export-plan-status export-plan-status--empty">
            No sessions in this range.
          </div>
        )}
        {status === 'error' && (
          <div className="export-plan-status export-plan-status--error">
            Something went wrong while exporting. Please try again.
          </div>
        )}
      </div>
    </Modal>
  )
}
