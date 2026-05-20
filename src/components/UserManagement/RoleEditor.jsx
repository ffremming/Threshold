import { Check } from 'lucide-react'
import { ROLE_DESCRIPTIONS, ROLE_LABELS, ROLE_OPTIONS, getUserRoles } from '../../roles'
import { ROLE_ICONS } from './RoleChip'

export default function RoleEditor({ user, busyRole, onToggle }) {
  const activeRoles = getUserRoles(user)

  return (
    <div className="tp-role-editor" role="group" aria-label="Roller">
      {ROLE_OPTIONS.map(role => {
        const Icon = ROLE_ICONS[role]
        const on = activeRoles.includes(role)
        return (
          <button
            key={role}
            type="button"
            className={`tp-role-toggle${on ? ' is-on' : ''}`}
            aria-pressed={on}
            disabled={busyRole === role}
            onClick={() => onToggle(role)}
          >
            <span className="tp-role-toggle-check" aria-hidden="true">
              {on && <Check size={14} strokeWidth={3} />}
            </span>
            <Icon size={18} strokeWidth={1.9} aria-hidden="true" />
            <span className="tp-role-toggle-body">
              <span className="tp-role-toggle-name">{ROLE_LABELS[role]}</span>
              <span className="tp-role-toggle-desc">{ROLE_DESCRIPTIONS[role]}</span>
            </span>
          </button>
        )
      })}
    </div>
  )
}
