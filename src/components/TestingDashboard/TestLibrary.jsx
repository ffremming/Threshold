import { Plus } from 'lucide-react'
import { Button, EmptyState, Section } from '../ui'
import TestRow from './TestRow'

export default function TestLibrary({ loading, groupedTests, startCreate, startEdit, handleDelete }) {
  if (loading) {
    return <EmptyState title="Loading tests…" />
  }
  return groupedTests.map(group => (
    <Section
      key={group.value}
      title={group.label}
      subtitle={group.description}
      action={
        <Button size="sm" onClick={() => startCreate(group.value)}>
          <Plus size={15} aria-hidden="true" />
          New test
        </Button>
      }
    >
      {group.tests.length === 0 ? (
        <div className="td-group-empty">No {group.label.toLowerCase()} tests registered yet.</div>
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
}
