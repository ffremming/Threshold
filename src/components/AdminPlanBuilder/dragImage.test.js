import { describe, it, expect, vi } from 'vitest'
import { setSessionDragImage, setSessionsDragImage, setClonedCellsDragImage } from './dragImage'

function makeEvent(withSetDragImage = true) {
  const dataTransfer = { setData: vi.fn() }
  if (withSetDragImage) dataTransfer.setDragImage = vi.fn()
  return { dataTransfer }
}

// A fake cell element with a stubbed bounding rect and a cloneNode.
function makeCell(key, rect, label) {
  const el = document.createElement('div')
  el.className = 'pb-month-cell is-selected-cell'
  el.dataset.cellKey = key
  el.textContent = label
  el.getBoundingClientRect = () => ({ ...rect, width: rect.right - rect.left, height: rect.bottom - rect.top })
  return el
}

describe('setSessionDragImage', () => {
  it('builds a card with the session title + zone label and calls setDragImage', () => {
    const event = makeEvent()
    setSessionDragImage(event, { title: '5x6 min', type: 'interval', intensityZone: [3, 4] })

    expect(event.dataTransfer.setDragImage).toHaveBeenCalledTimes(1)
    const [node] = event.dataTransfer.setDragImage.mock.calls[0]
    expect(node.className).toBe('pb-drag-ghost')
    expect(node.querySelector('.pb-drag-ghost-title').textContent).toBe('5x6 min')
    expect(node.querySelector('.pb-drag-ghost-zone').textContent).toBe('Zone 3-4')
  })

  it('falls back to a default title when none is set', () => {
    const event = makeEvent()
    setSessionDragImage(event, { type: 'easy', intensityZone: [2] })
    const [node] = event.dataTransfer.setDragImage.mock.calls[0]
    expect(node.querySelector('.pb-drag-ghost-title').textContent).toBe('Session')
  })

  it('is a no-op when setDragImage is unavailable', () => {
    const event = makeEvent(false)
    expect(() => setSessionDragImage(event, { title: 'X', type: 'easy', intensityZone: [1] })).not.toThrow()
  })
})

describe('setSessionsDragImage', () => {
  it('renders a stacked card for every dragged session', () => {
    const event = makeEvent()
    setSessionsDragImage(event, [
      { title: 'Long run', type: 'easy', intensityZone: [2] },
      { title: '5x6 min', type: 'interval', intensityZone: [4] },
      { title: 'Strength', type: 'easy', intensityZone: [1] },
    ])
    const [node] = event.dataTransfer.setDragImage.mock.calls[0]
    const titles = [...node.querySelectorAll('.pb-drag-ghost-title')].map(el => el.textContent)
    expect(titles).toEqual(['Long run', '5x6 min', 'Strength'])
  })

  it('renders a single card (no stack) for one session', () => {
    const event = makeEvent()
    setSessionsDragImage(event, [{ title: 'Solo', type: 'easy', intensityZone: [2] }])
    const [node] = event.dataTransfer.setDragImage.mock.calls[0]
    expect(node.className).toBe('pb-drag-ghost')
    expect(node.querySelector('.pb-drag-ghost-title').textContent).toBe('Solo')
  })

  it('is a no-op for an empty list', () => {
    const event = makeEvent()
    setSessionsDragImage(event, [])
    expect(event.dataTransfer.setDragImage).not.toHaveBeenCalled()
  })
})

describe('setClonedCellsDragImage', () => {
  it('clones each selected cell at its real offset from the bounding box', () => {
    const event = makeEvent()
    const cells = [
      makeCell('2026-21-1', { left: 100, right: 200, top: 50, bottom: 150 }, 'Mon'),
      makeCell('2026-21-4', { left: 400, right: 500, top: 50, bottom: 150 }, 'Thu'),
    ]
    const ok = setClonedCellsDragImage(event, cells, { x: 110, y: 60 })
    expect(ok).toBe(true)

    const [ghost, offX, offY] = event.dataTransfer.setDragImage.mock.calls[0]
    // Box spans left 100→500, top 50→150.
    expect(ghost.style.width).toBe('400px')
    expect(ghost.style.height).toBe('100px')
    // Cursor offset relative to box origin.
    expect(offX).toBe(10)
    expect(offY).toBe(10)

    const clones = [...ghost.children]
    expect(clones).toHaveLength(2)
    // First cell at box origin, second offset 300px right — exact horizontal layout.
    expect(clones[0].style.left).toBe('0px')
    expect(clones[1].style.left).toBe('300px')
    expect(clones[0].style.top).toBe('0px')
    // data-cell-key stripped from the clone.
    expect(clones[0].getAttribute('data-cell-key')).toBeNull()
  })

  it('returns false for fewer than two cells (caller falls back)', () => {
    const event = makeEvent()
    expect(setClonedCellsDragImage(event, [], { x: 0, y: 0 })).toBe(false)
    expect(setClonedCellsDragImage(event, [makeCell('k', { left: 0, right: 1, top: 0, bottom: 1 }, 'x')], { x: 0, y: 0 })).toBe(false)
  })
})
