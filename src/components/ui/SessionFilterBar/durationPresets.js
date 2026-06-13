// Duration filter presets (minutes). `max: null` means open-ended.
export const DURATION_PRESETS = [
  { label: '< 30 min', min: null, max: 29 },
  { label: '30–60 min', min: 30, max: 60 },
  { label: '60–90 min', min: 60, max: 90 },
  { label: '90 min +', min: 90, max: null },
]

// A preset is the active selection when the current duration bounds match it.
export function durationPresetActive(duration, preset) {
  if (!duration) return false
  return (duration.min ?? null) === (preset.min ?? null)
    && (duration.max ?? null) === (preset.max ?? null)
}
