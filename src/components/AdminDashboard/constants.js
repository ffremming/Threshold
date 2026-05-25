import {
  getDefaultCooldown,
  getDefaultIntensityZones,
  getDefaultLoadTag,
  getDefaultWarmup,
} from '../../utils'

export const EMPTY_TEMPLATE = {
  category: 'Intervall',
  type: 'interval',
  title: '',
  description: '',
  distance: '',
  sessionDetails: '',
  warmup: getDefaultWarmup('interval'),
  cooldown: getDefaultCooldown('interval'),
  exercises: '',
  rest: '',
  notes: '',
  intensityZone: getDefaultIntensityZones('interval'),
  loadTag: getDefaultLoadTag('interval', getDefaultIntensityZones('interval')),
  activityTag: '',
  weekday: '',
  time: '',
}

export const TAB_ITEMS = [
  { value: 'plan',     label: 'Ukeplan' },
  { value: 'oktbank',  label: 'Bibliotek' },
  { value: 'builder',  label: 'Planverktøy' },
  { value: 'analysis', label: 'Analyse' },
  { value: 'tests',    label: 'Tester' },
]
