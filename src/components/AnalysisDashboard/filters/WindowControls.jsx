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
          ariaLabel="Flytt analysevindu bakover"
          variant="ghost"
          disabled={windowStart <= 0}
          onClick={() => setWindowStart(prev => clampWindowStart(prev - Math.max(1, Math.floor(range / 2)), weeks.length, range))}
        ><ChevronLeft size={18} aria-hidden="true" /></IconButton>
        <div className="an-window-meta">
          <span className="an-eyebrow">Tidsvindu</span>
          <strong className="an-window-label">
            {visibleStartWeek ? getWeekLabel(visibleStartWeek) : 'Ingen data'}
            {visibleEndWeek ? ` – ${getWeekLabel(visibleEndWeek)}` : ''}
          </strong>
          <span className="an-window-help">
            {isCurrentWeekVisible ? 'Nåværende uke er i vinduet' : 'Bla for å se tidligere blokker eller fremover'}
          </span>
        </div>
        <IconButton
          ariaLabel="Flytt analysevindu fremover"
          variant="ghost"
          disabled={windowStart >= maxWindowStart}
          onClick={() => setWindowStart(prev => clampWindowStart(prev + Math.max(1, Math.floor(range / 2)), weeks.length, range))}
        ><ChevronRight size={18} aria-hidden="true" /></IconButton>
      </div>

      <div className="an-window-slider">
        <div className="an-window-slider-head">
          <span>Historikk</span>
          <span className="tp-num">{timelineProgress}%</span>
          <span>Framtid</span>
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
          >Sentrer på nå</Button>
        </div>
      </div>
    </Card>
  )
}
