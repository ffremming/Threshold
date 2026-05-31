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
import { isRateLimitError, withDatabaseWriteLimit } from '../../security/rateLimits'
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
        console.error('Could not fetch tests', err)
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

    try {
      if (editingTest && editingTest !== 'new') {
        await withDatabaseWriteLimit('tests', () => updateDoc(doc(db, 'tests', editingTest), payload))
      } else {
        await withDatabaseWriteLimit('tests', () => addDoc(collection(db, 'tests'), {
          ...payload,
          createdAt: serverTimestamp(),
          createdBy: userProfile?.uid || null,
        }))
      }
      resetForm()
    } catch (err) {
      window.alert(isRateLimitError(err) ? err.message : 'Could not save the test. Please try again.')
    }
  }

  async function handleDelete(test) {
    if (!window.confirm(`Delete the test "${test.title}"?`)) return
    try {
      await withDatabaseWriteLimit('tests', () => deleteDoc(doc(db, 'tests', test.id)))
      if (editingTest === test.id) resetForm()
    } catch (err) {
      window.alert(isRateLimitError(err) ? err.message : 'Could not delete the test. Please try again.')
    }
  }

  if (!selectedAthleteId) {
    return (
      <Page>
        <EmptyState
          title="No athlete selected"
          description="Select an athlete to view and edit test protocols."
        />
      </Page>
    )
  }

  return (
    <Page>
      <div className="td-stats td-stats--inline">
        <Stat label="Total" value={tests.length} />
        <Stat label="Strength" value={styrkeCount} />
        <Stat label="Endurance" value={utholdCount} />
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
      <span className="td-stat-value th-num">{value}</span>
      <span className="td-stat-label">{label}</span>
    </div>
  )
}
