export default function BuilderPanelHeader({ title, copy, panelId, visiblePanelIds, onMove, children }) {
  const panelIndex = visiblePanelIds.indexOf(panelId)
  const canMoveLeft = panelIndex > 0
  const canMoveRight = panelIndex >= 0 && panelIndex < visiblePanelIds.length - 1

  return (
    <div className="pb-panel-head">
      <div className="pb-panel-titles">
        <h2 className="pb-panel-title">{title}</h2>
        {copy ? <p className="pb-panel-copy">{copy}</p> : null}
      </div>
      <div className="pb-panel-tools">
        <div className="pb-panel-move">
          <button type="button" className="pb-panel-move-btn" onClick={() => onMove(panelId, -1)} disabled={!canMoveLeft} aria-label={`Flytt ${title} til venstre`}>
            ←
          </button>
          <button type="button" className="pb-panel-move-btn" onClick={() => onMove(panelId, 1)} disabled={!canMoveRight} aria-label={`Flytt ${title} til høyre`}>
            →
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}
