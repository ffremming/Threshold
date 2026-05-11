import SystemIcon from '../SystemIcon'

export default function TrashZone({ dragState, handleTrashDrop }) {
  if (dragState?.kind !== 'workout') return null

  return (
    <div
      className="pb-trash"
      onDragOver={event => {
        event.preventDefault()
        if (event.dataTransfer) event.dataTransfer.dropEffect = 'move'
      }}
      onDrop={async event => {
        event.preventDefault()
        await handleTrashDrop()
      }}
    >
      <SystemIcon name="delete" className="system-icon" />
      <span>Slipp her for å slette økten</span>
    </div>
  )
}
