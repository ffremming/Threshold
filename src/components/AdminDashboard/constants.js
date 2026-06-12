import {
  getDefaultIntensityZones,
  getDefaultLoadTag,
} from '../../utils'

export const EMPTY_TEMPLATE = {
  category: 'Hard',
  type: 'interval',
  title: '',
  description: '',
  distance: '',
  sessionDetails: '',
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
  { value: 'plan',     label: 'Week plan' },
  { value: 'oktbank',  label: 'Library' },
  { value: 'builder',  label: 'Plan builder' },
  { value: 'analysis', label: 'Analysis' },
  { value: 'tests',    label: 'Tests' },
]
