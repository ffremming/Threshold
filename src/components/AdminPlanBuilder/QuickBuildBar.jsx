import { useMemo, useState } from 'react'
import { Sparkles } from 'lucide-react'
import { Button } from '../ui'
import { weekTargetKey } from '../../utils/weekTargetTypes'

// Single-input quick-build control bar. One starting volume + a unit toggle +
// a weekly ramp % drives generation across a from→to week span (defaulting to
// the whole visible month). No per-week editing — the ramp derives each week.
export default function QuickBuildBar({ overviewWeeks, onGenerate }) {
  const weeks = overviewWeeks || []
  const [startVolume, setStartVolume] = useState('')
  const [unit, setUnit] = useState('time') // 'time' | 'distance'
  const [rampPct, setRampPct] = useState(0)
  const [fromKey, setFromKey] = useState('')
  const [toKey, setToKey] = useState('')

  // Default the span to the full visible range.
  const firstKey = weeks[0] ? weekTargetKey(weeks[0].week, weeks[0].year) : ''
  const lastKey = weeks[weeks.length - 1] ? weekTargetKey(weeks[weeks.length - 1].week, weeks[weeks.length - 1].year) : ''
  const from = fromKey || firstKey
  const to = toKey || lastKey

  // The {week,year} list inside the chosen span (inclusive), in calendar order.
  const range = useMemo(() => {
    if (!from || !to) return []
    const lo = from <= to ? from : to
    const hi = from <= to ? to : from
    return weeks
      .filter(w => {
        const k = weekTargetKey(w.week, w.year)
        return k >= lo && k <= hi
      })
      .map(w => ({ week: w.week, year: w.year }))
  }, [weeks, from, to])

  const volume = Number(startVolume)
  const canGenerate = volume > 0 && range.length > 0

  return (
    <div className="pb-quick-bar">
      <label className="pb-quick-field">
        <span>Start {unit === 'time' ? 'time' : 'distance'}</span>
        <input
          type="number"
          min="0"
          aria-label={unit === 'time' ? 'Start time (min)' : 'Start distance (km)'}
          value={startVolume}
          onChange={e => setStartVolume(e.target.value)}
          placeholder={unit === 'time' ? 'min' : 'km'}
        />
      </label>

      <div className="pb-quick-unit" role="group" aria-label="Volume unit">
        <button
          type="button"
          className={`pb-quick-unit-btn${unit === 'time' ? ' is-on' : ''}`}
          aria-pressed={unit === 'time'}
          onClick={() => setUnit('time')}
        >
          Time
        </button>
        <button
          type="button"
          className={`pb-quick-unit-btn${unit === 'distance' ? ' is-on' : ''}`}
          aria-pressed={unit === 'distance'}
          onClick={() => setUnit('distance')}
        >
          Distance
        </button>
      </div>

      <label className="pb-quick-field">
        <span>Ramp %</span>
        <input
          type="number"
          min="0"
          max="20"
          aria-label="Weekly ramp percent"
          value={rampPct}
          onChange={e => setRampPct(Number(e.target.value))}
        />
      </label>

      <label className="pb-quick-field">
        <span>From</span>
        <select aria-label="From week" value={from} onChange={e => setFromKey(e.target.value)}>
          {weeks.map(w => (
            <option key={weekTargetKey(w.week, w.year)} value={weekTargetKey(w.week, w.year)}>W{w.week}</option>
          ))}
        </select>
      </label>
      <label className="pb-quick-field">
        <span>To</span>
        <select aria-label="To week" value={to} onChange={e => setToKey(e.target.value)}>
          {weeks.map(w => (
            <option key={weekTargetKey(w.week, w.year)} value={weekTargetKey(w.week, w.year)}>W{w.week}</option>
          ))}
        </select>
      </label>

      <span className="pb-quick-count">{range.length} week{range.length === 1 ? '' : 's'}</span>

      <Button
        variant="primary"
        disabled={!canGenerate}
        onClick={() => onGenerate(range, { startVolume: volume, unit, rampPct })}
      >
        <Sparkles size={14} aria-hidden="true" /> Generate
      </Button>
    </div>
  )
}
