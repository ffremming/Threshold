import { useMemo, useState } from 'react'
import { Sparkles } from 'lucide-react'
import { Button, SportPicker } from '../ui'
import {
  QUALITY_ORDER, QUALITY_LABELS, QUALITY_COLORS, ACTIVITY_TAG_MAP,
} from '../../utils'
import { weekTargetKey } from '../../utils/weekTargetTypes'

// Default quality weights: an aerobic-base lean (endurance heavy) the coach tunes.
const DEFAULT_WEIGHTS = { threshold: 20, vo2max: 15, speed: 5, strength: 10, muscular_endurance: 10, endurance: 40 }

// Left settings panel for the quick-build view. Holds every block-level
// parameter — start volume + unit, weekly ramp, week span, per-quality weight
// sliders, hard sessions per week, and an activity split — and emits them to
// onGenerate(range, opts). One panel, applied to the whole selected period.
export default function QuickBuildSidebar({ overviewWeeks, onGenerate }) {
  const weeks = overviewWeeks || []
  const [startVolume, setStartVolume] = useState('')
  const [unit, setUnit] = useState('time') // 'time' | 'distance'
  const [rampPct, setRampPct] = useState(5)
  const [hardPerWeek, setHardPerWeek] = useState(3)
  const [weights, setWeights] = useState(DEFAULT_WEIGHTS)
  const [distribution, setDistribution] = useState({}) // { tag: % }
  const [fromKey, setFromKey] = useState('')
  const [toKey, setToKey] = useState('')

  const firstKey = weeks[0] ? weekTargetKey(weeks[0].week, weeks[0].year) : ''
  const lastKey = weeks[weeks.length - 1] ? weekTargetKey(weeks[weeks.length - 1].week, weeks[weeks.length - 1].year) : ''
  const from = fromKey || firstKey
  const to = toKey || lastKey

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

  const distEntries = Object.entries(distribution)
  const distTotal = distEntries.reduce((s, [, v]) => s + Number(v || 0), 0)
  const distOff = distEntries.length > 0 && Math.round(distTotal) !== 100

  function setWeight(q, v) {
    setWeights(prev => ({ ...prev, [q]: Number(v) }))
  }
  function syncDistTags(nextTags) {
    setDistribution(prev => {
      const next = {}
      for (const tag of nextTags) next[tag] = prev[tag] ?? 0
      return next
    })
  }
  function setDistPct(tag, v) {
    setDistribution(prev => ({ ...prev, [tag]: Number(v) }))
  }

  function generate() {
    // Drop zero-weight qualities so an all-zero set means "no preference".
    const activeWeights = Object.fromEntries(
      Object.entries(weights).filter(([, v]) => Number(v) > 0))
    onGenerate(range, {
      startVolume: volume,
      unit,
      rampPct: Number(rampPct),
      hardPerWeek: Number(hardPerWeek),
      qualityWeights: Object.keys(activeWeights).length ? activeWeights : null,
      distribution: distEntries.length ? distribution : null,
    })
  }

  return (
    <aside className="pb-qb-sidebar">
      <h3 className="pb-qb-title">Quick build</h3>

      <section className="pb-qb-section">
        <div className="pb-qb-unit" role="group" aria-label="Volume unit">
          <button type="button" className={`pb-qb-unit-btn${unit === 'time' ? ' is-on' : ''}`} aria-pressed={unit === 'time'} onClick={() => setUnit('time')}>Time</button>
          <button type="button" className={`pb-qb-unit-btn${unit === 'distance' ? ' is-on' : ''}`} aria-pressed={unit === 'distance'} onClick={() => setUnit('distance')}>Distance</button>
        </div>
        <label className="pb-qb-field">
          <span>{unit === 'time' ? 'Start time (min/week)' : 'Start distance (km/week)'}</span>
          <input
            type="number" min="0"
            aria-label={unit === 'time' ? 'Start time (min)' : 'Start distance (km)'}
            value={startVolume}
            onChange={e => setStartVolume(e.target.value)}
            placeholder={unit === 'time' ? 'min' : 'km'}
          />
        </label>
        <label className="pb-qb-field">
          <span>Weekly ramp %</span>
          <input type="number" min="0" max="20" aria-label="Weekly ramp percent" value={rampPct} onChange={e => setRampPct(e.target.value)} />
        </label>
      </section>

      <section className="pb-qb-section">
        <span className="pb-qb-section-label">Weeks</span>
        <div className="pb-qb-span">
          <label className="pb-qb-field">
            <span>From</span>
            <select aria-label="From week" value={from} onChange={e => setFromKey(e.target.value)}>
              {weeks.map(w => <option key={weekTargetKey(w.week, w.year)} value={weekTargetKey(w.week, w.year)}>W{w.week}</option>)}
            </select>
          </label>
          <label className="pb-qb-field">
            <span>To</span>
            <select aria-label="To week" value={to} onChange={e => setToKey(e.target.value)}>
              {weeks.map(w => <option key={weekTargetKey(w.week, w.year)} value={weekTargetKey(w.week, w.year)}>W{w.week}</option>)}
            </select>
          </label>
        </div>
        <span className="pb-qb-hint">{range.length} week{range.length === 1 ? '' : 's'} selected</span>
      </section>

      <section className="pb-qb-section">
        <span className="pb-qb-section-label">Intensity</span>
        <label className="pb-qb-field">
          <span>Hard sessions / week</span>
          <input type="number" min="0" max="7" aria-label="Hard sessions per week" value={hardPerWeek} onChange={e => setHardPerWeek(e.target.value)} />
        </label>
      </section>

      <section className="pb-qb-section">
        <span className="pb-qb-section-label">Quality balance</span>
        {QUALITY_ORDER.map(q => (
          <div key={q} className="pb-qb-weight">
            <span className="pb-qb-weight-label" style={{ color: QUALITY_COLORS[q] }}>{QUALITY_LABELS[q]}</span>
            <input
              type="range" min="0" max="100"
              aria-label={`${QUALITY_LABELS[q]} weight`}
              value={weights[q] ?? 0}
              onChange={e => setWeight(q, e.target.value)}
              style={{ accentColor: QUALITY_COLORS[q] }}
            />
            <span className="pb-qb-weight-val">{weights[q] ?? 0}</span>
          </div>
        ))}
      </section>

      <section className="pb-qb-section">
        <span className="pb-qb-section-label">Activity split</span>
        {distEntries.map(([tag, pct]) => {
          const meta = ACTIVITY_TAG_MAP[tag]
          return (
            <div key={tag} className="pb-qb-dist-row">
              <span className="pb-qb-dist-tag" style={{ color: meta?.color }}>{meta?.label || tag}</span>
              <input type="number" min="0" max="100" aria-label={`${meta?.label || tag} %`} value={pct} onChange={e => setDistPct(tag, e.target.value)} />
            </div>
          )
        })}
        <div className="pb-qb-dist-foot">
          {distEntries.length > 0 && <span className={`pb-qb-dist-total${distOff ? ' is-off' : ''}`}>{Math.round(distTotal)}%</span>}
          <SportPicker value={distEntries.map(([t]) => t)} onChange={syncDistTags} placeholder="+ sport" />
        </div>
        {distEntries.length === 0 && <span className="pb-qb-hint">No split → match the bank</span>}
      </section>

      <Button variant="primary" block disabled={!canGenerate} onClick={generate}>
        <Sparkles size={14} aria-hidden="true" /> Generate
      </Button>
    </aside>
  )
}
