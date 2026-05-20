import { ShieldCheck, ClipboardList, User } from 'lucide-react'
import { ROLE_LABELS } from '../../roles'

export const ROLE_ICONS = {
  superadmin: ShieldCheck,
  coach: ClipboardList,
  athlete: User,
}

export default function RoleChip({ role }) {
  const Icon = ROLE_ICONS[role] || User
  return (
    <span className={`tp-role-chip tp-role-chip--${role}`}>
      <Icon size={12} strokeWidth={2} aria-hidden="true" />
      {ROLE_LABELS[role] || role}
    </span>
  )
}
