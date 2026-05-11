export const TEST_CATEGORIES = [
  { value: 'styrke',      label: 'Styrke',      description: '1RM, 3RM, hopp, repetisjoner eller tekniske tester.' },
  { value: 'utholdenhet', label: 'Utholdenhet', description: 'Terskel, VO2, distanse, tid eller pulsbaserte tester.' },
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
