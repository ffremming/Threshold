import { useEffect, useMemo, useState } from 'react'
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  query,
  serverTimestamp,
  updateDoc,
  where,
} from 'firebase/firestore'
import { db } from '../firebase'
import {
  Page,
  PageHeader,
  Section,
  EmptyState,
  Button,
  IconButton,
  Card,
  Pill,
  Field,
  Input,
  Select,
  Textarea,
} from './ui'
import './TestingDashboard.css'

const TEST_CATEGORIES = [
  { value: 'styrke',      label: 'Styrke',      description: '1RM, 3RM, hopp, repetisjoner eller tekniske tester.' },
  { value: 'utholdenhet', label: 'Utholdenhet', description: 'Terskel, VO2, distanse, tid eller pulsbaserte tester.' },
]

const EMPTY_FORM = {
  category: 'styrke',
  title: '',
  protocol: '',
  metric: '',
  baseline: '',
  target: '',
  scheduledDate: '',
  notes: '',
}

function sortTests(a, b) {
  const dateA = a.scheduledDate || ''
  const dateB = b.scheduledDate || ''
  if (dateA !== dateB) return dateA.localeCompare(dateB)
  return a.title.localeCompare(b.title, 'no')
}

export default function TestingDashboard({ selectedAthleteId, athleteName, userProfile }) {
  const [tests, setTests] = useState([])
  const [loading, setLoading] = useState(true)
  const [editingTest, setEditingTest] = useState(null)
  const [form, setForm] = useState(EMPTY_FORM)

  useEffect(() => {
    if (!selectedAthleteId) { setTests([]); setLoading(false); return }
    setLoading(true)
    const unsub = onSnapshot(
      query(collection(db, 'tests'), where('athleteId', '==', selectedAthleteId)),
      snap => {
        setTests(snap.docs.map(d => ({ id: d.id, ...d.data() })).sort(sortTests))
        setLoading(false)
      }
    )
    return unsub
  }, [selectedAthleteId])

  const groupedTests = useMemo(() => (
    TEST_CATEGORIES.map(category => ({
      ...category,
      tests: tests.filter(t => t.category === category.value),
    }))
  ), [tests])

  const styrkeCount = groupedTests.find(g => g.value === 'styrke')?.tests.length || 0
  const utholdCount = groupedTests.find(g => g.value === 'utholdenhet')?.tests.length || 0

  function update(key, value) { setForm(prev => ({ ...prev, [key]: value })) }
  function startCreate(category) { setEditingTest('new'); setForm({ ...EMPTY_FORM, category }) }
  function startEdit(test) {
    setEditingTest(test.id)
    setForm({
      category: test.category || 'styrke',
      title: test.title || '',
      protocol: test.protocol || '',
      metric: test.metric || '',
      baseline: test.baseline || '',
      target: test.target || '',
      scheduledDate: test.scheduledDate || '',
      notes: test.notes || '',
    })
  }
  function resetForm() { setEditingTest(null); setForm(EMPTY_FORM) }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!selectedAthleteId || !form.title.trim()) return

    const payload = {
      athleteId: selectedAthleteId,
      category: form.category,
      title: form.title.trim(),
      protocol: form.protocol.trim(),
      metric: form.metric.trim(),
      baseline: form.baseline.trim(),
      target: form.target.trim(),
      scheduledDate: form.scheduledDate || '',
      notes: form.notes.trim(),
      updatedAt: serverTimestamp(),
      updatedBy: userProfile?.uid || null,
    }

    if (editingTest === 'new') {
      await addDoc(collection(db, 'tests'), { ...payload, createdAt: serverTimestamp(), createdBy: userProfile?.uid || null })
    } else {
      await updateDoc(doc(db, 'tests', editingTest), payload)
    }
    resetForm()
  }

  async function handleDelete(test) {
    if (!window.confirm(`Slett testen "${test.title}"?`)) return
    await deleteDoc(doc(db, 'tests', test.id))
    if (editingTest === test.id) resetForm()
  }

  return (
    <Page>
      <PageHeader
        eyebrow="Testing"
        title={`Tester for ${athleteName || 'valgt utøver'}`}
        subtitle="Opprett og vedlikehold testprotokoller for styrke og utholdenhet."
        actions={
          <div className="td-stats">
            <Stat label="Totalt" value={tests.length} />
            <Stat label="Styrke" value={styrkeCount} />
            <Stat label="Utholdenhet" value={utholdCount} />
          </div>
        }
      />

      <div className="td-layout">
        <div className="td-library">
          {loading ? (
            <EmptyState title="Laster tester…" />
          ) : (
            groupedTests.map(group => (
              <Section
                key={group.value}
                title={group.label}
                subtitle={group.description}
                action={<Button size="sm" onClick={() => startCreate(group.value)}>+ Ny test</Button>}
              >
                {group.tests.length === 0 ? (
                  <div className="td-group-empty">Ingen {group.label.toLowerCase()}-tester registrert ennå.</div>
                ) : (
                  <div className="td-test-list">
                    {group.tests.map(test => (
                      <TestRow
                        key={test.id}
                        test={test}
                        groupLabel={group.label}
                        onEdit={() => startEdit(test)}
                        onDelete={() => handleDelete(test)}
                      />
                    ))}
                  </div>
                )}
              </Section>
            ))
          )}
        </div>

        <aside className="td-editor">
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
        </aside>
      </div>
    </Page>
  )
}

function Stat({ label, value }) {
  return (
    <div className="td-stat">
      <span className="td-stat-value tp-num">{value}</span>
      <span className="td-stat-label">{label}</span>
    </div>
  )
}

function TestRow({ test, groupLabel, onEdit, onDelete }) {
  return (
    <article className="td-test">
      <header className="td-test-head">
        <div className="td-test-titles">
          <Pill>{groupLabel}</Pill>
          <h4 className="td-test-title">{test.title}</h4>
        </div>
        <div className="td-test-actions">
          <Button size="sm" variant="secondary" onClick={onEdit}>Rediger</Button>
          <IconButton size="sm" variant="danger" ariaLabel="Slett" onClick={onDelete}>×</IconButton>
        </div>
      </header>

      <dl className="td-test-meta">
        <MetaItem label="Protokoll" value={test.protocol} />
        <MetaItem label="Målepunkt" value={test.metric} />
        <MetaItem label="Siste resultat" value={test.baseline} />
        <MetaItem label="Mål" value={test.target} />
        <MetaItem label="Testdato" value={test.scheduledDate} fallback="Ikke planlagt" />
      </dl>

      {test.notes && <p className="td-test-notes">{test.notes}</p>}
    </article>
  )
}

function MetaItem({ label, value, fallback = 'Ikke satt' }) {
  return (
    <div className="td-meta">
      <dt>{label}</dt>
      <dd>{value || fallback}</dd>
    </div>
  )
}
