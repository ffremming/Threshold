import { StrictMode, useState } from 'react'
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import '@testing-library/jest-dom'
import { TemplateEditorModal } from '../AdminDashboard/TemplateModals'
import { EMPTY_TEMPLATE } from '../AdminDashboard/constants'

// Mirrors AdminDashboard exactly: parent owns templateForm + editingTemplate,
// renders the real TemplateEditorModal. Wrapped in StrictMode like main.jsx.
function Harness() {
  const [editingTemplate, setEditingTemplate] = useState('new')
  const [templateForm, setTemplateForm] = useState({ ...EMPTY_TEMPLATE })
  return (
    <TemplateEditorModal
      editingTemplate={editingTemplate}
      templateForm={templateForm}
      setTemplateForm={setTemplateForm}
      onSave={(e) => e.preventDefault()}
      onClose={() => setEditingTemplate(null)}
    />
  )
}

describe('template form focus', () => {
  it('keeps focus in Title while typing (StrictMode)', async () => {
    const user = userEvent.setup()
    render(<StrictMode><Harness /></StrictMode>)
    const title = screen.getByPlaceholderText('E.g. Easy jog')
    await user.click(title)
    await user.keyboard('Easy run')
    expect(title).toHaveValue('Easy run')
    expect(document.activeElement).toBe(title)
  })

  it('keeps focus in the Exercise name field while typing', async () => {
    const user = userEvent.setup()
    render(<StrictMode><Harness /></StrictMode>)
    // Default template is an interval session; switch activity to Strength so
    // a strength "exercise" section with a text input appears.
    const strength = [...document.querySelectorAll('.activity-tag-btn')]
      .find(b => /strength/i.test(b.textContent))
    await user.click(strength)
    const exercise = await screen.findByPlaceholderText('E.g. Squat')
    await user.click(exercise)
    await user.keyboard('Squat')
    expect(exercise).toHaveValue('Squat')
    expect(document.activeElement).toBe(exercise)
  })
})
