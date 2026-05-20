import { useState } from 'react'
import SystemIcon from '../SystemIcon'

export default function TrashZone({ dragState, handleTrashDrop }) {
  const [isOver, setIsOver] = useState(false)

  if (dragState?.kind !== 'workout') return null

  return (
    <div
      className={`pb-trash${isOver ? ' is-target' : ''}`}
      role="button"
      aria-label="Slipp en økt her for å slette den"
      onDragOver={event => {
        event.preventDefault()
        if (event.dataTransfer) event.dataTransfer.dropEffect = 'move'
        setIsOver(true)
      }}
      onDragLeave={() => setIsOver(false)}
      onDrop={async event => {
        event.preventDefault()
        setIsOver(false)
        await handleTrashDrop()
      }}
    >
      <SystemIcon name="delete" className="system-icon" />
      <span>Slipp her for å slette økten</span>
    </div>
  )
}
