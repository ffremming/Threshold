import { Sparkles } from 'lucide-react'
import { Button } from '../ui'

// Top bar for the Plan view: shows the selected week range, a ramp-% input, and
// a Generate button that fills the range from the bank. `selection` is a list of
// {week,year}.
export default function GenerateBar({ selection, onGenerate, settings, onSettingsChange }) {
  const count = selection?.length || 0
  return (
    <div className="pb-generate-bar">
      <span className="pb-generate-info">
        {count > 0 ? `${count} week${count > 1 ? 's' : ''} selected` : 'Select weeks to generate'}
      </span>
      <label className="pb-generate-ramp">
        Ramp %
        <input
          type="number"
          min="0"
          max="20"
          value={settings?.rampPct ?? 0}
          onChange={e => onSettingsChange({ rampPct: Number(e.target.value) })}
        />
      </label>
      <Button variant="primary" disabled={count === 0} onClick={onGenerate}>
        <Sparkles size={14} aria-hidden="true" /> Generate
      </Button>
    </div>
  )
}
