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
import { db } from '../../firebase'
import { EmptyState, Page } from '../ui'
import TestLibrary from './TestLibrary'
import TestEditor from './TestEditor'
import { TEST_CATEGORIES, EMPTY_FORM, sortTests } from './constants'
import '../TestingDashboard.css'

export default function TestingDashboard({ selectedAthleteId, userProfile }) {
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
      },
      err => {
        console.error('Kunne ikke hente tester', err)
        setTests([])
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

    if (editingTest && editingTest !== 'new') {
      await updateDoc(doc(db, 'tests', editingTest), payload)
    } else {
      await addDoc(collection(db, 'tests'), { ...payload, createdAt: serverTimestamp(), createdBy: userProfile?.uid || null })
    }
    resetForm()
  }

  async function handleDelete(test) {
    if (!window.confirm(`Slett testen "${test.title}"?`)) return
    await deleteDoc(doc(db, 'tests', test.id))
    if (editingTest === test.id) resetForm()
  }

  if (!selectedAthleteId) {
    return (
      <Page>
        <EmptyState
          title="Ingen utøver valgt"
          description="Velg en utøver for å se og redigere testprotokoller."
        />
      </Page>
    )
  }

  return (
    <Page>
      <div className="td-stats td-stats--inline">
        <Stat label="Totalt" value={tests.length} />
        <Stat label="Styrke" value={styrkeCount} />
        <Stat label="Utholdenhet" value={utholdCount} />
      </div>

      <div className="td-layout">
        <div className="td-library">
          <TestLibrary
            loading={loading}
            groupedTests={groupedTests}
            startCreate={startCreate}
            startEdit={startEdit}
            handleDelete={handleDelete}
          />
        </div>

        <aside className="td-editor">
          <TestEditor
            editingTest={editingTest}
            form={form}
            update={update}
            resetForm={resetForm}
            handleSubmit={handleSubmit}
          />
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
