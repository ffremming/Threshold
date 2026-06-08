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

  it('lets the user pick a strength exercise from the library', async () => {
    const user = userEvent.setup()
    render(<StrictMode><Harness /></StrictMode>)
    // Default template is an interval session; switch activity to Strength so
    // a strength "exercise" section with the exercise picker appears.
    const strength = [...document.querySelectorAll('.activity-tag-btn')]
      .find(b => /strength/i.test(b.textContent))
    await user.click(strength)

    // The free-text field is gone — there's now a picker trigger.
    const trigger = await screen.findByText('Choose an exercise…')
    await user.click(trigger)

    // Picker modal opens with a search box; search and select an exercise.
    const search = await screen.findByPlaceholderText('Search exercises…')
    await user.type(search, 'barbell squat')
    // Several names contain "barbell squat"; double-click the exact match.
    const matches = await screen.findAllByRole('button', { name: /^Barbell Squat\b/ })
    const exact = matches.find(b => b.querySelector('.th-exercise-item-name')?.textContent === 'Barbell Squat')
    await user.dblClick(exact)

    // Selection closes the picker (search box gone) and fills the trigger label.
    await screen.findByText((_, el) =>
      el?.classList.contains('th-exercise-trigger') && /Barbell Squat/.test(el.textContent),
    )
    expect(screen.queryByPlaceholderText('Search exercises…')).not.toBeInTheDocument()
  })
})
