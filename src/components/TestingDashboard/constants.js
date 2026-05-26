export const TEST_CATEGORIES = [
  { value: 'styrke',      label: 'Strength',  description: '1RM, 3RM, jumps, repetitions, or technical tests.' },
  { value: 'utholdenhet', label: 'Endurance', description: 'Threshold, VO2, distance, time, or heart-rate based tests.' },
]

export const EMPTY_FORM = {
  category: 'styrke',
  title: '',
  protocol: '',
  metric: '',
  baseline: '',
  target: '',
  scheduledDate: '',
  notes: '',
}

export function sortTests(a, b) {
  const dateA = a.scheduledDate || ''
  const dateB = b.scheduledDate || ''
  if (dateA !== dateB) return dateA.localeCompare(dateB)
  return a.title.localeCompare(b.title, 'no')
}
