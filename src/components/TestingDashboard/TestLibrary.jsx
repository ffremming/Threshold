import { Button, EmptyState, Section } from '../ui'
import TestRow from './TestRow'

export default function TestLibrary({ loading, groupedTests, startCreate, startEdit, handleDelete }) {
  if (loading) {
    return <EmptyState title="Laster tester…" />
  }
  return groupedTests.map(group => (
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
}
