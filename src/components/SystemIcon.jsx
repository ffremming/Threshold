import {
  ArrowDown,
  ArrowUp,
  CalendarDays,
  Check,
  Copy,
  LayoutDashboard,
  LogIn,
  LogOut,
  Pencil,
  Repeat2,
  Settings2,
  Trash2,
  UserRoundX,
  Users2,
  X,
} from 'lucide-react'

const ICONS = {
  calendar: CalendarDays,
  dashboard: LayoutDashboard,
  login: LogIn,
  logout: LogOut,
  settings: Settings2,
  users: Users2,
  close: X,
  edit: Pencil,
  delete: Trash2,
  replace: Repeat2,
  duplicate: Copy,
  check: Check,
  up: ArrowUp,
  down: ArrowDown,
  unassign: UserRoundX,
}

export default function SystemIcon({ name, className = '', title, strokeWidth = 1.9 }) {
  const Icon = ICONS[name]
  if (!Icon) return null

  return <Icon aria-hidden={title ? undefined : 'true'} aria-label={title} className={className} strokeWidth={strokeWidth} />
}
