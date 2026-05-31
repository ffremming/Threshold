import { INTERVALL_TEMPLATES } from './intervall'
import { TERSKEL_TEMPLATES } from './terskel'
import { ROLIG_TEMPLATES } from './rolig'
import { STYRKE_TEMPLATES } from './styrke'

export const WORKOUT_TEMPLATES = [
  ...INTERVALL_TEMPLATES,
  ...TERSKEL_TEMPLATES,
  ...ROLIG_TEMPLATES,
  ...STYRKE_TEMPLATES,
]

const CATEGORY_ORDER = ['Easy', 'Hard']
export const TEMPLATE_CATEGORIES = [
  'All',
  ...CATEGORY_ORDER.filter(cat => WORKOUT_TEMPLATES.some(t => t.category === cat)),
]
