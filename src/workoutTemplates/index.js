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

export const TEMPLATE_CATEGORIES = ['All', ...new Set(WORKOUT_TEMPLATES.map(t => t.category))]
