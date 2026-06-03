import { describe, it, expect } from 'vitest'
import { needsRefresh } from '../strava/tokens.js'

describe('needsRefresh', () => {
  it('is true when expiry is in the past', () => {
    expect(needsRefresh(1000, 2000)).toBe(true)
  })
  it('is true within the 60s safety window', () => {
    expect(needsRefresh(2000, 1950)).toBe(true) // 50s left < 60s buffer
  })
  it('is false when comfortably valid', () => {
    expect(needsRefresh(10000, 1000)).toBe(false)
  })
})
