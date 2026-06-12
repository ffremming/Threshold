import { describe, it, expect, vi } from 'vitest'
import { render } from '@testing-library/react'
import '@testing-library/jest-dom'

// react-body-highlighter renders SVG; stub it so the test asserts our wrapper
// logic (show/hide + data wiring) without depending on the library internals.
vi.mock('react-body-highlighter', () => ({
  default: ({ data }) => <div data-testid="body-model" data-regions={(data || []).length} />,
}))

import MuscleHeatmap from './MuscleHeatmap'

describe('MuscleHeatmap', () => {
  it('renders nothing when no muscles were worked (pure-cardio week)', () => {
    const { container } = render(<MuscleHeatmap musclesWorked={{}} />)
    expect(container.firstChild).toBeNull()
  })

  it('renders nothing for undefined musclesWorked', () => {
    const { container } = render(<MuscleHeatmap musclesWorked={undefined} />)
    expect(container.firstChild).toBeNull()
  })

  it('renders the figure with mapped regions when strength work exists', () => {
    const { getAllByTestId, getByText } = render(
      <MuscleHeatmap musclesWorked={{ quadriceps: 5, chest: 4 }} title="Muscles trained" />
    )
    expect(getByText('Muscles trained')).toBeInTheDocument()
    // MuscleMap renders two figures (front + back), each receiving data.
    const models = getAllByTestId('body-model')
    expect(models.length).toBe(2)
    expect(Number(models[0].getAttribute('data-regions'))).toBeGreaterThan(0)
  })
})
