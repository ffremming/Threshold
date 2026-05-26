import { ZONE_INFO } from '../utils'
import SystemIcon from './SystemIcon'
import './IntensityScaleModal.css'

const ZONE_LABELS = {
  1: 'Intensity zone 1',
  2: 'Intensity zone 2',
  3: 'Intensity zone 3',
  4: 'Intensity zone 4',
  5: 'Intensity zone 5',
}

export default function IntensityScaleModal({ onClose }) {
  function handleBackdrop(e) {
    if (e.target === e.currentTarget) onClose()
  }

  return (
    <div className="modal-backdrop intensity-modal-backdrop" onClick={handleBackdrop}>
      <div className="modal intensity-modal">
        <button className="modal-close" onClick={onClose} aria-label="Close">
          <SystemIcon name="close" className="system-icon" />
        </button>
        <h2 className="intensity-modal-title">Your intensity scale</h2>
        <div className="intensity-zone-list">
          {[1, 2, 3, 4, 5].map(zone => {
            const info = ZONE_INFO[zone]
            return (
              <div
                key={zone}
                className="intensity-zone"
                style={{ '--zone-color': `var(--tp-zone-${zone})` }}
              >
                <div className="intensity-zone-header">{ZONE_LABELS[zone]}</div>
                <div className="intensity-zone-body">
                  <div className="intensity-zone-row">
                    <span className="intensity-zone-label">RPE description</span>
                    {info.rpe}
                  </div>
                  <div className="intensity-zone-row">
                    <span className="intensity-zone-label">Heart rate</span>
                    {info.hr} bpm
                  </div>
                  <div className="intensity-zone-row">
                    <span className="intensity-zone-label">Ventilation / breathing</span>
                    {info.breathing}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
