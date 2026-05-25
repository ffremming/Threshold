import WorkoutForm from '../WorkoutForm'
import { Button, PageShell, ShellBrand, Page } from '../ui'
import { useNav } from '../../App/primaryNav'

export default function CustomFormView({ customForm, setCustomForm, onSubmit, onCancel, currentWeek }) {
  const nav = useNav()
  return (
    <PageShell
      brand={<ShellBrand onBack={onCancel} eyebrow="Ny økt" title="Egendefinert økt" />}
      nav={nav?.items}
      navActive="admin"
      onNavChange={nav?.onChange}
      account={nav?.account}
      selectedAthlete={nav?.selectedAthlete}
    >
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
