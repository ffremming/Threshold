import { describe, it, expect } from 'vitest'
import { ZONE_COLORS, getZoneBorderColors, getZoneBarBackground } from './intensity'

describe('zone color coding', () => {
  it('returns a single zone border color', () => {
    expect(getZoneBorderColors([3])).toEqual([ZONE_COLORS[3].border])
  })

  it('returns both colors for multiple zones in order', () => {
    expect(getZoneBorderColors([3, 4])).toEqual([ZONE_COLORS[3].border, ZONE_COLORS[4].border])
  })

  it('falls back to neutral grey when no zones', () => {
    expect(getZoneBorderColors([])).toEqual(['#94a3b8'])
  })

  it('uses a single full-height band for one zone', () => {
    const bg = getZoneBarBackground([2])
    expect(bg).toContain('linear-gradient')
    expect(bg).toContain(`${ZONE_COLORS[2].border} 0%, ${ZONE_COLORS[2].border} 100%`)
  })

  it('uses a hard-stop gradient of both colors for two zones', () => {
    const bg = getZoneBarBackground([4, 5])
    expect(bg).toContain('linear-gradient')
    expect(bg).toContain(ZONE_COLORS[4].border)
    expect(bg).toContain(ZONE_COLORS[5].border)
    // equal bands: first color 0%–50%, second 50%–100%
    expect(bg).toContain(`${ZONE_COLORS[4].border} 0%, ${ZONE_COLORS[4].border} 50%`)
    expect(bg).toContain(`${ZONE_COLORS[5].border} 50%, ${ZONE_COLORS[5].border} 100%`)
  })
})
