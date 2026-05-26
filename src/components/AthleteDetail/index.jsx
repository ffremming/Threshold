import { useEffect, useState } from 'react'
import { onUserProfileSnapshot } from '../../userService'
import { PageShell, ShellBrand, Page, Section } from '../ui'
import { useNav } from '../../App/primaryNav'
import AthleteSessionPool from '../AthleteSessionPool'
import ProfileCard from './ProfileCard'
import ResultsCard from './ResultsCard'
import '../AthleteDetail.css'

export default function AthleteDetail({ athlete, coach, onBack }) {
  const nav = useNav()
  const [profile, setProfile] = useState(athlete)

  useEffect(() => {
    if (!athlete?.uid) return
    return onUserProfileSnapshot(athlete.uid, p => p && setProfile(p))
  }, [athlete?.uid])

  return (
    <PageShell
      brand={
        <ShellBrand
          onBack={onBack}
          eyebrow="Athlete"
          title={profile?.displayName || profile?.email || 'Athlete'}
        />
      }
      nav={nav?.items}
      navActive="athletes"
      onNavChange={nav?.onChange}
      account={nav?.account}
      selectedAthlete={nav?.selectedAthlete}
    >
      <Page>
        <Section
          title="Profile & zones"
          subtitle="Max HR and threshold pace are used to shape training zones"
        >
          <ProfileCard profile={profile} />
        </Section>

        <Section
          title="Results"
          subtitle="Log distance and time from races and tests"
        >
          <ResultsCard profile={profile} />
        </Section>

        <Section
          title="Session bank for athlete"
          subtitle="Personal sessions for this athlete. Changes here do not affect the coach's bank."
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
