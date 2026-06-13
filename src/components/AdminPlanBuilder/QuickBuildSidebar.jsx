import { useMemo, useState } from 'react'
import { Sparkles, X } from 'lucide-react'
import { Button, SportPicker } from '../ui'
import {
  QUALITY_ORDER, QUALITY_LABELS, QUALITY_COLORS, ACTIVITY_TAG_MAP,
} from '../../utils'
import { getSessionDomain } from '../../sessionBlocks/units'
import { weekTargetKey } from '../../utils/weekTargetTypes'

// Default quality weights: an aerobic-base lean the coach tunes.
const DEFAULT_WEIGHTS = { threshold: 20, vo2max: 15, speed: 5, strength: 10, muscular_endurance: 10, endurance: 40 }

// Weekday roles. 1=Mon..7=Sun. Default: hard on Tue/Thu/Sat, long run on Sun,
// everything else easy. Clicking a day cycles through these roles.
const DAY_ROLE_CYCLE = ['easy', 'hard', 'long', 'rest']
const DAY_SHORT = { 1: 'Mon', 2: 'Tue', 3: 'Wed', 4: 'Thu', 5: 'Fri', 6: 'Sat', 7: 'Sun' }
const DAY_LONG = { 1: 'Monday', 2: 'Tuesday', 3: 'Wednesday', 4: 'Thursday', 5: 'Friday', 6: 'Saturday', 7: 'Sunday' }
const DEFAULT_DAY_ROLES = { 1: 'easy', 2: 'hard', 3: 'easy', 4: 'hard', 5: 'easy', 6: 'hard', 7: 'long' }
const ROLE_COLOR = { easy: '#22c55e', hard: '#ef4444', long: '#6366f1', rest: '#94a3b8' }

// A blank activity target row. Distance-domain sports default to a distance
// target; everything else (strength, mobility, ball sports) to time.
function newRow(tag) {
  const unit = getSessionDomain(tag) === 'distance' ? 'distance' : 'time'
  return { tag, volume: '', unit }
}

// Left settings panel for the quick-build view. Per-activity rows (each a volume
// in distance or time + a hard on/off toggle) plus a weekly ramp, a week span,
// and per-quality weight sliders. Emits everything to onGenerate(range, opts).
export default function QuickBuildSidebar({ overviewWeeks, onGenerate }) {
  const weeks = overviewWeeks || []
  const [rows, setRows] = useState([newRow('run')])
  const [rampPct, setRampPct] = useState(5)
  const [hardDays, setHardDays] = useState(3)
  const [dayRoles, setDayRoles] = useState(DEFAULT_DAY_ROLES)
  const [weights, setWeights] = useState(DEFAULT_WEIGHTS)
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

  const activities = rows
    .map(r => ({ tag: r.tag, volume: Number(r.volume), unit: r.unit }))
    .filter(a => a.volume > 0)
  const canGenerate = activities.length > 0 && range.length > 0

  function patchRow(tag, patch) {
    setRows(prev => prev.map(r => (r.tag === tag ? { ...r, ...patch } : r)))
  }
  function removeRow(tag) {
    setRows(prev => prev.filter(r => r.tag !== tag))
  }
  // SportPicker returns the full next tag list; add new rows, drop removed ones,
  // keep existing rows' values.
  function syncRows(nextTags) {
    setRows(prev => {
      const byTag = new Map(prev.map(r => [r.tag, r]))
      return nextTags.map(tag => byTag.get(tag) || newRow(tag))
    })
  }
  function setWeight(q, v) {
    setWeights(prev => ({ ...prev, [q]: Number(v) }))
  }
  function cycleDay(d) {
    setDayRoles(prev => {
      const i = DAY_ROLE_CYCLE.indexOf(prev[d] || 'easy')
      return { ...prev, [d]: DAY_ROLE_CYCLE[(i + 1) % DAY_ROLE_CYCLE.length] }
    })
  }

  function generate() {
    const activeWeights = Object.fromEntries(
      Object.entries(weights).filter(([, v]) => Number(v) > 0))
    onGenerate(range, {
      activities,
      rampPct: Number(rampPct),
      hardPerWeek: Number(hardDays),
      dayTags: dayRoles,
      qualityWeights: Object.keys(activeWeights).length ? activeWeights : null,
    })
  }

  return (
    <aside className="pb-qb-sidebar">
      <h3 className="pb-qb-title">Quick build</h3>

      <section className="pb-qb-section">
        <span className="pb-qb-section-label">Activities</span>
        {rows.map(r => {
          const meta = ACTIVITY_TAG_MAP[r.tag]
          return (
            <div key={r.tag} className="pb-qb-act" data-testid={`activity-row-${r.tag}`}>
              <div className="pb-qb-act-head">
                <span className="pb-qb-act-name" style={{ color: meta?.color }}>{meta?.label || r.tag}</span>
                <button type="button" className="pb-qb-act-remove" aria-label={`Remove ${meta?.label || r.tag}`} onClick={() => removeRow(r.tag)}>
                  <X size={11} aria-hidden="true" />
                </button>
              </div>
              <div className="pb-qb-act-body">
                <input
                  type="number" min="0"
                  className="pb-qb-act-vol"
                  aria-label={`${meta?.label || r.tag} volume`}
                  value={r.volume}
                  onChange={e => patchRow(r.tag, { volume: e.target.value })}
                  placeholder={r.unit === 'distance' ? 'km' : 'min'}
                />
                <div className="pb-qb-unit" role="group" aria-label={`${meta?.label || r.tag} unit`}>
                  <button type="button" className={`pb-qb-unit-btn${r.unit === 'distance' ? ' is-on' : ''}`} aria-label={`${meta?.label || r.tag} distance unit`} aria-pressed={r.unit === 'distance'} onClick={() => patchRow(r.tag, { unit: 'distance' })}>km</button>
                  <button type="button" className={`pb-qb-unit-btn${r.unit === 'time' ? ' is-on' : ''}`} aria-label={`${meta?.label || r.tag} time unit`} aria-pressed={r.unit === 'time'} onClick={() => patchRow(r.tag, { unit: 'time' })}>min</button>
                </div>
              </div>
            </div>
          )
        })}
        <SportPicker value={rows.map(r => r.tag)} onChange={syncRows} placeholder="+ activity" />
      </section>

      <section className="pb-qb-section">
        <span className="pb-qb-section-label">Intensity</span>
        <label className="pb-qb-field">
          <span>Hard days / week</span>
          <input type="number" min="0" max="7" aria-label="Hard days per week" value={hardDays} onChange={e => setHardDays(e.target.value)} />
        </label>
        <div className="pb-qb-days" role="group" aria-label="Weekday roles">
          {[1, 2, 3, 4, 5, 6, 7].map(d => {
            const role = dayRoles[d] || 'easy'
            return (
              <button
                key={d}
                type="button"
                className={`pb-qb-day is-${role}`}
                aria-label={`${DAY_LONG[d]}: ${role}. Click to change.`}
                title={`${DAY_LONG[d]}: ${role}`}
                onClick={() => cycleDay(d)}
                style={{ '--role-color': ROLE_COLOR[role] }}
              >
                <span className="pb-qb-day-name">{DAY_SHORT[d]}</span>
                <span className="pb-qb-day-role">{role}</span>
              </button>
            )
          })}
        </div>
      </section>

      <section className="pb-qb-section">
        <span className="pb-qb-section-label">Progression</span>
        <label className="pb-qb-field">
          <span>Weekly ramp %</span>
          <input type="number" min="0" max="20" aria-label="Weekly ramp percent" value={rampPct} onChange={e => setRampPct(e.target.value)} />
        </label>
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

      <Button variant="primary" block disabled={!canGenerate} onClick={generate}>
        <Sparkles size={14} aria-hidden="true" /> Generate
      </Button>
    </aside>
  )
}
