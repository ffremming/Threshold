import { useEffect, useMemo, useState } from 'react'
import {
  addRelationship,
  removeRelationship,
  onRelationshipsSnapshot,
  onCoachesSnapshot,
} from '../../userService'
import { Page, PageShell, ShellBrand } from '../ui'
import { useNav } from '../../App/primaryNav'
import RelationshipSection from '../UserManagement/RelationshipSection'

export default function MyCoaches({ currentUser, onBack }) {
  const nav = useNav()
  const [coaches, setCoaches] = useState([])
  const [relationships, setRelationships] = useState([])

  useEffect(() => {
    const unsubCoaches = onCoachesSnapshot(setCoaches)
    const unsubRels = onRelationshipsSnapshot(setRelationships)
    return () => { unsubCoaches(); unsubRels() }
  }, [])

  const myCoaches = useMemo(() => {
    const coachIds = new Set(
      relationships.filter(r => r.athleteId === currentUser.uid).map(r => r.coachId)
    )
    return coaches.filter(c => coachIds.has(c.uid))
  }, [relationships, coaches, currentUser.uid])

  const unassigned = useMemo(
    () => coaches.filter(
      c => c.uid !== currentUser.uid && !myCoaches.some(mc => mc.uid === c.uid)
    ),
    [coaches, myCoaches, currentUser.uid]
  )

  async function handleAdd(coach) {
    try {
      await addRelationship(coach.uid, currentUser.uid)
    } catch (err) {
      window.alert(`Could not add the coach: ${err.message}`)
    }
  }

  async function handleRemove(coach) {
    if (!window.confirm('Remove this coach?')) return
    try {
      await removeRelationship(coach.uid, currentUser.uid)
    } catch (err) {
      window.alert(`Could not remove the coach: ${err.message}`)
    }
  }

  return (
    <PageShell
      brand={<ShellBrand onBack={onBack} eyebrow="My account" title="My coaches" />}
      nav={nav?.items}
      navActive={null}
      onNavChange={nav?.onChange}
      account={nav?.account}
      selectedAthlete={nav?.selectedAthlete}
    >
      <Page>
        <RelationshipSection
          title="My coaches"
          subtitle="Coaches who follow up your training."
          emptyLabel="You haven't added a coach yet."
          members={myCoaches}
          unassigned={unassigned}
          hideEmail
          addLabel="Add coach"
          assignTitle="Select a coach to add"
          noneLeftLabel="No more coaches available."
          onAdd={handleAdd}
          onRemove={handleRemove}
        />
      </Page>
    </PageShell>
  )
}
