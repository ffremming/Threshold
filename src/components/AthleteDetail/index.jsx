import { useEffect, useState } from 'react'
import { onUserProfileSnapshot } from '../../userService'
import { Button, PageShell, ShellBrand, Page, Section } from '../ui'
import AthleteSessionPool from '../AthleteSessionPool'
import ProfileCard from './ProfileCard'
import ResultsCard from './ResultsCard'
import '../AthleteDetail.css'

export default function AthleteDetail({ athlete, coach, onBack }) {
  const [profile, setProfile] = useState(athlete)

  useEffect(() => {
    if (!athlete?.uid) return
    return onUserProfileSnapshot(athlete.uid, p => p && setProfile(p))
  }, [athlete?.uid])

  return (
    <PageShell
      brand={
        <ShellBrand
          eyebrow="Utøver"
          title={profile?.displayName || profile?.email || 'Utøver'}
        />
      }
      actions={
        <Button variant="ghost" size="sm" onClick={onBack}>
          <span aria-hidden="true">‹</span> Tilbake
        </Button>
      }
    >
      <Page>
        <Section
          title="Profil & soner"
          subtitle="Maks HR og terskel-tempo brukes til å forme treningssoner"
        >
          <ProfileCard profile={profile} />
        </Section>

        <Section
          title="Resultater"
          subtitle="Logg distanse og tid fra konkurranser og tester"
        >
          <ResultsCard profile={profile} />
        </Section>

        <Section
          title="Øktbank for utøver"
          subtitle="Egne økter for denne utøveren. Endringer her påvirker ikke trenerens bank."
        >
          <AthleteSessionPool
            coachId={coach?.uid}
            athleteId={profile?.uid}
          />
        </Section>
      </Page>
    </PageShell>
  )
}
