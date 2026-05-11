import WorkoutForm from '../WorkoutForm'
import { Button, PageShell, ShellBrand, Page } from '../ui'

export default function CustomFormView({ customForm, setCustomForm, onSubmit, onCancel, currentWeek }) {
  return (
    <PageShell brand={<ShellBrand onBack={onCancel} eyebrow="Ny økt" title="Egendefinert økt" />}>
      <Page>
        <form onSubmit={onSubmit} className="tp-form">
          <WorkoutForm value={customForm} onChange={setCustomForm} showScheduleFields />
          <div className="tp-form-actions">
            <Button variant="secondary" type="button" onClick={onCancel}>Avbryt</Button>
            <Button type="submit">Legg til i uke {currentWeek}</Button>
          </div>
        </form>
      </Page>
    </PageShell>
  )
}
