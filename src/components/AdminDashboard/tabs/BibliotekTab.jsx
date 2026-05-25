import { useState } from 'react'
import AthleteSessionPool from '../../AthleteSessionPool'
import LibraryBrowser from '../../LibraryBrowser'
import { Page, EmptyState } from '../../ui'
import OktbankTab from './OktbankTab'
import './bibliotek.css'

/* ────────────────────────────────────────────────────────────────────
 * BibliotekTab — merged "Øktbank" view with a scope switcher.
 *
 * Three scopes:
 *   • 'global'  — Bibliotek (read for all, edit/create only superadmin)
 *   • 'mine'    — Coach's personal bank (default for the tab)
 *   • 'athlete' — Sessions tailored for the currently-selected athlete
 *
 * Adding workouts to an athlete's plan happens only from Planverktøy —
 * the Øktbank is a browsing/curation surface, not an add-to-plan entry.
 *
 * Adding TO the global library is intentionally not supported here —
 * library curation lives only inside scope='global' as the create
 * action available to superadmins.
 * ──────────────────────────────────────────────────────────────────── */

const SCOPES = [
  { value: 'mine',    label: 'Min bank' },
  { value: 'global',  label: 'Bibliotek' },
  { value: 'athlete', label: 'Utøver' },
]

export default function BibliotekTab(p) {
  const [scope, setScope] = useState('mine')

  const coachId = p.userProfile?.uid
  const athleteId = p.selectedAthleteId

  const showAthleteScope = Boolean(athleteId)
  const visibleScopes = SCOPES.filter(s => s.value !== 'athlete' || showAthleteScope)

  return (
    <>
      <div className="bib-scope-wrap">
        <div className="bib-scope" role="tablist" aria-label="Velg bibliotek">
          {visibleScopes.map(s => (
            <button
              key={s.value}
              type="button"
              role="tab"
              aria-selected={scope === s.value}
              className={`bib-scope-btn${scope === s.value ? ' is-active' : ''}`}
              onClick={() => setScope(s.value)}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {scope === 'mine' && (
        <OktbankTab
          templates={p.templates}
          activeCategory={p.activeCategory}
          setActiveCategory={p.setActiveCategory}
          loadingTemplates={p.loadingTemplates}
          pickingFromBank={p.pickingFromBank}
          replacementTarget={p.replacementTarget}
          currentWeek={p.currentWeek}
          handleAddFromTemplate={p.handleAddFromTemplate}
          startEditTemplate={p.startEditTemplate}
          handleDeleteTemplate={p.handleDeleteTemplate}
          startNewTemplate={p.startNewTemplate}
        />
      )}

      {scope === 'global' && (
        <LibraryBrowser
          globalTemplates={p.globalTemplates}
          loading={p.loadingGlobalTemplates}
          onAddToBank={p.handleAddFromLibrary}
          isAlreadyInBank={p.isAlreadyInBank}
          isSuperadmin={p.isSuperadmin}
          onEditGlobal={p.isSuperadmin ? p.startEditGlobalTemplate : null}
          onDeleteGlobal={p.isSuperadmin ? p.handleDeleteGlobalTemplate : null}
          onCreateGlobal={p.isSuperadmin ? p.startNewGlobalTemplate : null}
        />
      )}

      {scope === 'athlete' && (
        athleteId ? (
          <Page>
            <AthleteSessionPool coachId={coachId} athleteId={athleteId} />
          </Page>
        ) : (
          <Page>
            <EmptyState
              title="Ingen utøver valgt"
              description="Velg en utøver i sidemenyen for å se deres egne økter."
            />
          </Page>
        )
      )}
    </>
  )
}
