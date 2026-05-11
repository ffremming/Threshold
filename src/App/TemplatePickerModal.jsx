import { EmptyState, Modal, TemplateCard } from '../components/ui'

export default function TemplatePickerModal({ targetWorkout, templates, loading, onClose, onPick }) {
  return (
    <Modal
      open
      onClose={onClose}
      eyebrow="Bytt økt"
      title={`Erstatt «${targetWorkout.title}»`}
      size="lg"
    >
      {loading ? (
        <EmptyState title="Laster øktbank…" />
      ) : templates.length === 0 ? (
        <EmptyState title="Tom øktbank" description="Du har ingen økter i banken ennå." />
      ) : (
        <div className="ah-template-grid">
          {templates.map(template => (
            <TemplateCard
              key={template.id}
              template={template}
              primaryLabel="Bytt til denne"
              onPrimary={() => onPick(template)}
            />
          ))}
        </div>
      )}
    </Modal>
  )
}
