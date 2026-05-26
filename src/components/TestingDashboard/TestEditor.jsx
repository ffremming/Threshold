import { Button, Card, Field, Input, Select, Textarea } from '../ui'
import { TEST_CATEGORIES } from './constants'

export default function TestEditor({ editingTest, form, update, resetForm, handleSubmit }) {
  return (
    <Card>
      <header className="td-editor-head">
        <div>
          <span className="td-eyebrow">Test editor</span>
          <h3 className="td-editor-title">{editingTest && editingTest !== 'new' ? 'Edit test' : 'New test'}</h3>
        </div>
      </header>

      <form className="td-form" onSubmit={handleSubmit}>
        <Field label="Category">
          <Select value={form.category} onChange={e => update('category', e.target.value)}>
            {TEST_CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
          </Select>
        </Field>

        <Field label="Test name">
          <Input
            type="text"
            value={form.title}
            onChange={e => update('title', e.target.value)}
            placeholder="E.g. 5 km treadmill test"
            required
          />
        </Field>

        <Field label="Protocol">
          <Textarea
            rows={3}
            value={form.protocol}
            onChange={e => update('protocol', e.target.value)}
            placeholder="Describe how the test is performed"
          />
        </Field>

        <Field label="Measurement">
          <Input
            type="text"
            value={form.metric}
            onChange={e => update('metric', e.target.value)}
            placeholder="E.g. time, watts, kg, repetitions"
          />
        </Field>

        <div className="td-form-grid">
          <Field label="Last result">
            <Input type="text" value={form.baseline} onChange={e => update('baseline', e.target.value)} placeholder="E.g. 21:42" />
          </Field>
          <Field label="Target">
            <Input type="text" value={form.target} onChange={e => update('target', e.target.value)} placeholder="E.g. under 20:30" />
          </Field>
        </div>

        <Field label="Scheduled date">
          <Input type="date" value={form.scheduledDate} onChange={e => update('scheduledDate', e.target.value)} />
        </Field>

        <Field label="Notes">
          <Textarea
            rows={4}
            value={form.notes}
            onChange={e => update('notes', e.target.value)}
            placeholder="Equipment, standardization, reference values, or coach notes"
          />
        </Field>

        <div className="td-form-actions">
          {editingTest && (
            <Button type="button" variant="ghost" onClick={resetForm}>Cancel</Button>
          )}
          <Button type="submit">{editingTest && editingTest !== 'new' ? 'Save changes' : 'Create test'}</Button>
        </div>
      </form>
    </Card>
  )
}
