import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom'

import QualityBars from './QualityBars'
import QualityRadar from './QualityRadar'
import QualityWidget from './QualityWidget'

const DIMS = { threshold: 81, endurance: 72, muscular_endurance: 58, speed: 40, vo2max: 34, strength: 25 }

describe('QualityBars', () => {
  it('renders every quality label and its rounded value', () => {
    render(<QualityBars dims={DIMS} />)
    expect(screen.getByText('Threshold')).toBeInTheDocument()
    expect(screen.getByText('Endurance')).toBeInTheDocument()
    expect(screen.getByText('Strength')).toBeInTheDocument()
    expect(screen.getByText('81')).toBeInTheDocument()
    expect(screen.getByText('25')).toBeInTheDocument()
  })

  it('treats missing dims as zero', () => {
    render(<QualityBars dims={{}} />)
    // six bars, all zero
    expect(screen.getAllByText('0')).toHaveLength(6)
  })
})

describe('QualityRadar', () => {
  it('renders an svg with a 6-point data polygon', () => {
    const { container } = render(<QualityRadar dims={DIMS} />)
    const area = container.querySelector('svg polygon.q-radar-area')
    expect(area).toBeTruthy()
    expect(area.getAttribute('points').trim().split(/\s+/)).toHaveLength(6)
  })
})

describe('QualityWidget', () => {
  it('renders the radar svg and the five bars together', () => {
    const { container } = render(<QualityWidget dims={DIMS} title="Training quality" />)
    expect(container.querySelector('svg.q-radar')).toBeTruthy()
    expect(container.querySelector('svg polygon.q-radar-area')).toBeTruthy()
    expect(screen.getByText('Training quality')).toBeInTheDocument()
    // "Threshold" appears in both the bars and the radar labels — both render.
    expect(screen.getAllByText('Threshold').length).toBeGreaterThanOrEqual(2)
    expect(screen.getByText('81')).toBeInTheDocument()
  })
})
