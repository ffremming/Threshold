import { hasRole } from '../roles'
import { Select } from './ui'

export default function AthleteSelector({
  athletes,
  selectedAthleteId,
  onSelect,
  currentUserProfile,
  hideLabel = false,
}) {
  if (!athletes || athletes.length === 0) return null

  const isSuperadmin = hasRole(currentUserProfile, 'superadmin')
  const visibleAthletes = isSuperadmin
    ? athletes.filter(a => a.uid !== currentUserProfile.uid)
    : athletes

  const labelFor = (a) =>
    a.uid === currentUserProfile?.uid ? `${a.displayName} (meg)` : a.displayName

  return (
    <div className="athlete-selector">
      {!hideLabel && (
        <label className="athlete-selector-label" htmlFor="athlete-selector">
          Utøver:
        </label>
      )}
      <Select
        id="athlete-selector"
        className="athlete-dropdown"
        value={selectedAthleteId || ''}
        onChange={e => onSelect(e.target.value)}
        aria-label="Velg utøver"
      >
        {isSuperadmin && (
          <option value={currentUserProfile.uid}>
            {currentUserProfile.displayName} (meg)
          </option>
        )}
        {visibleAthletes.map(a => (
          <option key={a.uid} value={a.uid}>{labelFor(a)}</option>
        ))}
      </Select>
    </div>
  )
}
