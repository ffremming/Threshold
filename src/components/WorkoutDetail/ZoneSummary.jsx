import { ZONE_COLORS, ZONE_INFO } from '../../utils'

export default function ZoneSummary({ zones, colors, zoneLabel, onClick }) {
  return (
    <button
      type="button"
      className="modal-section zone-summary"
      style={{ '--zone-color': colors.border }}
      onClick={onClick}
      title="Trykk for å se din intensitetsskala"
    >
      <div className="section-label">{zoneLabel}</div>
      <div className="zone-multi-stats">
        {zones.map(selectedZone => {
          const zoneInfo = ZONE_INFO[selectedZone]
          const zoneColors = ZONE_COLORS[selectedZone]

          return (
            <div
              key={selectedZone}
              className="zone-mini-card"
              style={{ '--zone-color': zoneColors.border }}
            >
              <strong>{zoneColors.label}</strong>
              <span>HR {zoneInfo.hr} bpm</span>
              <span>Pust {zoneInfo.breathing}</span>
            </div>
          )
        })}
      </div>
      <div className="zone-summary-hint">
        Trykk for å se full intensitetsskala
      </div>
    </button>
  )
}
