import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Button, Card, IconButton } from '../../ui'
import { clampWindowStart, getWeekLabel } from '../utils'
import './window.css'

export default function WindowControls({
  weeks, range, windowStart, setWindowStart, maxWindowStart,
  visibleStartWeek, visibleEndWeek, isCurrentWeekVisible, timelineProgress, currentIndex,
}) {
  return (
    <Card className="an-window">
      <div className="an-window-nav">
        <IconButton
          ariaLabel="Move analysis window backward"
          variant="ghost"
          disabled={windowStart <= 0}
          onClick={() => setWindowStart(prev => clampWindowStart(prev - Math.max(1, Math.floor(range / 2)), weeks.length, range))}
        ><ChevronLeft size={18} aria-hidden="true" /></IconButton>
        <div className="an-window-meta">
          <span className="an-eyebrow">Time window</span>
          <strong className="an-window-label">
            {visibleStartWeek ? getWeekLabel(visibleStartWeek) : 'No data'}
            {visibleEndWeek ? ` – ${getWeekLabel(visibleEndWeek)}` : ''}
          </strong>
          <span className="an-window-help">
            {isCurrentWeekVisible ? 'Current week is in the window' : 'Scroll to see earlier blocks or ahead'}
          </span>
        </div>
        <IconButton
          ariaLabel="Move analysis window forward"
          variant="ghost"
          disabled={windowStart >= maxWindowStart}
          onClick={() => setWindowStart(prev => clampWindowStart(prev + Math.max(1, Math.floor(range / 2)), weeks.length, range))}
        ><ChevronRight size={18} aria-hidden="true" /></IconButton>
      </div>

      <div className="an-window-slider">
        <div className="an-window-slider-head">
          <span>History</span>
          <span className="th-num">{timelineProgress}%</span>
          <span>Future</span>
        </div>
        <input
          type="range"
          min="0"
          max={String(maxWindowStart)}
          step="1"
          value={windowStart}
          onChange={e => setWindowStart(Number(e.target.value))}
          className="an-range"
        />
        <div className="an-window-actions">
          <Button
            size="sm"
            variant="secondary"
            disabled={currentIndex === -1}
            onClick={() => setWindowStart(clampWindowStart(currentIndex - Math.floor(range / 2), weeks.length, range))}
          >Center on now</Button>
        </div>
      </div>
    </Card>
  )
}
