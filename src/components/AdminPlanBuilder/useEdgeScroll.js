import { useEffect } from 'react'

export function useEdgeScroll(dragState) {
  useEffect(() => {
    if (!dragState) return

    const EDGE = 90
    const MAX_SPEED = 22
    let pointerY = null
    let frame = null

    function step() {
      if (pointerY == null) {
        frame = null
        return
      }
      const viewportH = window.innerHeight
      let delta = 0
      if (pointerY < EDGE) {
        delta = -MAX_SPEED * (1 - pointerY / EDGE)
      } else if (pointerY > viewportH - EDGE) {
        delta = MAX_SPEED * (1 - (viewportH - pointerY) / EDGE)
      }
      if (delta !== 0) {
        window.scrollBy(0, delta)
      }
      frame = window.requestAnimationFrame(step)
    }

    function handleDragOver(event) {
      pointerY = event.clientY
      if (frame == null) frame = window.requestAnimationFrame(step)
    }

    window.addEventListener('dragover', handleDragOver)

    return () => {
      window.removeEventListener('dragover', handleDragOver)
      if (frame != null) window.cancelAnimationFrame(frame)
    }
  }, [dragState])
}
