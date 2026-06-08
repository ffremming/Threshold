import {
  formatIntensityZoneLabel,
  normalizeIntensityZones,
  getZoneBarBackground,
  workoutHasZones,
} from '../../utils'

// One card element for a session: title + zone label, with the zone-color bar.
// Strength sessions have no zone, so they get neither a label nor an accent bar.
function buildGhostCard(session) {
  const showZone = workoutHasZones(session.activityTag)
  const zones = showZone ? normalizeIntensityZones(session.type, session.intensityZone) : []
  const zoneLabel = showZone ? formatIntensityZoneLabel(zones) : null

  const card = document.createElement('div')
  card.className = 'pb-drag-ghost'
  card.style.setProperty('--pb-zone-bar', showZone ? getZoneBarBackground(zones) : 'none')

  const titleEl = document.createElement('span')
  titleEl.className = 'pb-drag-ghost-title'
  titleEl.textContent = session.title || 'Session'
  card.appendChild(titleEl)

  if (zoneLabel) {
    const zoneEl = document.createElement('span')
    zoneEl.className = 'pb-drag-ghost-zone'
    zoneEl.textContent = zoneLabel
    card.appendChild(zoneEl)
  }
  return card
}

// Appends `node` off-screen, hands it to the native drag, then removes it on the
// next tick (after the browser snapshots it). The node must be in the DOM when
// setDragImage is called.
function applyDragImage(event, node) {
  document.body.appendChild(node)
  try {
    event.dataTransfer.setDragImage(node, 12, 12)
  } catch {
    // ignore — fall back to the default ghost
  }
  requestAnimationFrame(() => node.remove())
}

// Crisp custom drag image for a single session — replaces the browser's faint,
// often-clipped default ghost.
export function setSessionDragImage(event, session) {
  if (!event?.dataTransfer || typeof document === 'undefined') return
  // Some environments (jsdom in tests) don't implement setDragImage.
  if (typeof event.dataTransfer.setDragImage !== 'function') return
  applyDragImage(event, buildGhostCard(session))
}

// Drag image for moving several sessions at once (whole-day or multi-cell
// selection): a stacked list with EVERY session's card visible, so the user can
// see exactly what they're placing. Fallback when live cell nodes aren't
// available (e.g. the week view, or tests).
export function setSessionsDragImage(event, sessions) {
  if (!event?.dataTransfer || typeof document === 'undefined') return
  if (typeof event.dataTransfer.setDragImage !== 'function') return
  const list = sessions || []
  if (list.length === 0) return
  if (list.length === 1) {
    applyDragImage(event, buildGhostCard(list[0]))
    return
  }
  const stack = document.createElement('div')
  stack.className = 'pb-drag-ghost-stack'
  list.forEach(session => stack.appendChild(buildGhostCard(session)))
  applyDragImage(event, stack)
}

// Drag image built by cloning the actual selected day-cell elements at their
// real on-screen offsets — so the ghost reproduces the exact horizontal layout,
// widths, and spacing the sessions occupy in the month grid. The user sees a 1:1
// copy of the selection and exactly where it will land.
export function setClonedCellsDragImage(event, cellEls, cursor = { x: 0, y: 0 }) {
  if (!event?.dataTransfer || typeof document === 'undefined') return false
  if (typeof event.dataTransfer.setDragImage !== 'function') return false
  const cells = (cellEls || []).filter(Boolean)
  if (cells.length < 2) return false

  const rects = cells.map(el => el.getBoundingClientRect())
  const minLeft = Math.min(...rects.map(r => r.left))
  const minTop = Math.min(...rects.map(r => r.top))
  const maxRight = Math.max(...rects.map(r => r.right))
  const maxBottom = Math.max(...rects.map(r => r.bottom))

  const ghost = document.createElement('div')
  ghost.className = 'pb-drag-ghost-clone'
  ghost.style.width = `${maxRight - minLeft}px`
  ghost.style.height = `${maxBottom - minTop}px`

  cells.forEach((el, i) => {
    const r = rects[i]
    const clone = el.cloneNode(true)
    // Neutralise interactive attributes copied from the live cell.
    clone.removeAttribute('data-cell-key')
    clone.style.position = 'absolute'
    clone.style.left = `${r.left - minLeft}px`
    clone.style.top = `${r.top - minTop}px`
    clone.style.width = `${r.width}px`
    clone.style.height = `${r.height}px`
    clone.style.margin = '0'
    ghost.appendChild(clone)
  })

  // Offset the drag image so the cursor keeps its grab point relative to the box.
  const offsetX = Number.isFinite(cursor?.x) ? cursor.x - minLeft : 12
  const offsetY = Number.isFinite(cursor?.y) ? cursor.y - minTop : 12
  document.body.appendChild(ghost)
  try {
    event.dataTransfer.setDragImage(ghost, offsetX, offsetY)
  } catch {
    ghost.remove()
    return false
  }
  requestAnimationFrame(() => ghost.remove())
  return true
}
