import { Button, Card, Field, Input, Select, Textarea } from '../ui'
import { TEST_CATEGORIES } from './constants'

export default function TestEditor({ editingTest, form, update, resetForm, handleSubmit }) {
  return (
    <Card>
      <header className="td-editor-head">
        <div>
          <span className="td-eyebrow">Test editor</span>
          <h3 className="td-editor-title">{editingTest ? 'Rediger test' : 'Ny test'}</h3>
        </div>
        {editingTest && (
          <Button size="sm" variant="ghost" onClick={resetForm}>Nullstill</Button>
        )}
      </header>

      <form className="td-form" onSubmit={handleSubmit}>
        <Field label="Kategori">
          <Select value={form.category} onChange={e => update('category', e.target.value)}>
            {TEST_CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
          </Select>
        </Field>

        <Field label="Navn på test">
          <Input
            type="text"
            value={form.title}
            onChange={e => update('title', e.target.value)}
            placeholder="F.eks. 5 km mølletest"
            required
          />
        </Field>

        <Field label="Protokoll">
          <Textarea
            rows={3}
            value={form.protocol}
            onChange={e => update('protocol', e.target.value)}
            placeholder="Beskriv hvordan testen gjennomføres"
          />
        </Field>

        <Field label="Målepunkt">
          <Input
            type="text"
            value={form.metric}
            onChange={e => update('metric', e.target.value)}
            placeholder="F.eks. tid, watt, kg, repetisjoner"
          />
        </Field>

        <div className="td-form-grid">
          <Field label="Siste resultat">
            <Input type="text" value={form.baseline} onChange={e => update('baseline', e.target.value)} placeholder="F.eks. 21:42" />
          </Field>
          <Field label="Mål">
            <Input type="text" value={form.target} onChange={e => update('target', e.target.value)} placeholder="F.eks. under 20:30" />
          </Field>
        </div>

        <Field label="Planlagt dato">
          <Input type="date" value={form.scheduledDate} onChange={e => update('scheduledDate', e.target.value)} />
        </Field>

        <Field label="Notater">
          <Textarea
            rows={4}
            value={form.notes}
            onChange={e => update('notes', e.target.value)}
            placeholder="Utstyr, standardisering, referanseverdier eller coach-notater"
          />
        </Field>

        <div className="td-form-actions">
          <Button type="button" variant="secondary" onClick={resetForm}>Tøm</Button>
          <Button type="submit">{editingTest === 'new' ? 'Opprett test' : 'Lagre'}</Button>
        </div>
      </form>
    </Card>
  )
}
