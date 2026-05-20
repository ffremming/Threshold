export function formatPaceLabel(paceSecPerKm) {
  if (!paceSecPerKm || paceSecPerKm <= 0) return '–'
  const mins = Math.floor(paceSecPerKm / 60)
  const secs = Math.round(paceSecPerKm % 60)
  return `${mins}:${String(secs).padStart(2, '0')} /km`
}

export function formatSpeedLabel(speedKmh) {
  if (!speedKmh || speedKmh <= 0) return '–'
  return `${speedKmh.toFixed(1)} km/t`
}

export function formatDuration(minutes) {
  if (!Number.isFinite(minutes) || minutes <= 0) return '0 min'
  if (minutes >= 60) {
    const h = Math.floor(minutes / 60)
    const m = Math.round(minutes % 60)
    return m > 0 ? `${h}t ${m}m` : `${h}t`
  }
  return `${Math.round(minutes)} min`
}

export function formatDistance(km) {
  if (!Number.isFinite(km) || km <= 0) return '0 km'
  if (km < 1) return `${Math.round(km * 1000)} m`
  return `${km.toFixed(km < 10 ? 1 : 0)} km`
}

export function formatPauseLabel(seconds) {
  if (!seconds || seconds <= 0) return 'ingen pause'
  if (seconds >= 60) {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return secs > 0 ? `${mins}m ${secs}s pause` : `${mins} min pause`
  }
  return `${seconds}s pause`
}

export function formatLoad(loadKg) {
  if (!Number.isFinite(loadKg) || loadKg <= 0) return 'kroppsvekt'
  const rounded = Number.isInteger(loadKg) ? loadKg : Number(loadKg.toFixed(1))
  return `${rounded} kg`
}

export function formatSetsReps(sets, reps) {
  const s = Math.max(1, Math.round(Number(sets) || 1))
  const r = Math.max(0, Math.round(Number(reps) || 0))
  return r > 0 ? `${s} × ${r}` : `${s} sett`
}

export function formatSeconds(totalSec) {
  const sec = Math.max(0, Math.round(Number(totalSec) || 0))
  if (sec >= 60) {
    const m = Math.floor(sec / 60)
    const s = sec % 60
    return s > 0 ? `${m}m ${String(s).padStart(2, '0')}s` : `${m} min`
  }
  return `${sec}s`
}
