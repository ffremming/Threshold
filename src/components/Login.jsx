import { useState } from 'react'
import { motion as m } from 'framer-motion'
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth'
import { auth } from '../firebase'
import { createUserProfile } from '../userService'
import {
  Button,
  Field,
  GradientText,
  Input,
  InvertedSection,
  Modal,
  SectionLabel,
  motion as motionVariants,
} from './ui'
import './Login.css'

const { fadeInUp, stagger, viewport, floatY, floatYAlt } = motionVariants

export default function Login({ onClose, fullScreen }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [isRegistering, setIsRegistering] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      if (isRegistering) {
        if (!displayName.trim()) { setError('Skriv inn navnet ditt'); setLoading(false); return }
        const cred = await createUserWithEmailAndPassword(auth, email, password)
        await createUserProfile(cred.user.uid, email, displayName.trim(), 'athlete')
      } else {
        await signInWithEmailAndPassword(auth, email, password)
      }
      onClose?.()
    } catch (err) {
      if (isRegistering) {
        if (err.code === 'auth/email-already-in-use') setError('Denne e-posten er allerede registrert')
        else if (err.code === 'auth/weak-password')   setError('Passordet må være minst 6 tegn')
        else                                          setError('Kunne ikke registrere. Prøv igjen.')
      } else {
        setError('Feil e-post eller passord')
      }
      setLoading(false)
    }
  }

  function toggleMode() { setIsRegistering(p => !p); setError('') }

  const form = (
    <form onSubmit={handleSubmit} className="tp-login-form">
      {isRegistering && (
        <Field label="Navn">
          <Input
            type="text"
            value={displayName}
            onChange={e => setDisplayName(e.target.value)}
            placeholder="Ditt fulle navn"
            autoComplete="name"
            required
            autoFocus
          />
        </Field>
      )}
      <Field label="E-post">
        <Input
          type="email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          placeholder="din@epost.no"
          autoComplete="email"
          required
          autoFocus={!isRegistering}
        />
      </Field>
      <Field label="Passord" hint={isRegistering ? 'Minst 6 tegn' : null}>
        <Input
          type="password"
          value={password}
          onChange={e => setPassword(e.target.value)}
          placeholder="••••••••"
          autoComplete={isRegistering ? 'new-password' : 'current-password'}
          required
        />
      </Field>

      {error && <div className="tp-login-error" role="alert">{error}</div>}

      <Button type="submit" variant="primary" size="lg" block disabled={loading}>
        {loading
          ? (isRegistering ? 'Registrerer…' : 'Logger inn…')
          : (isRegistering ? 'Opprett konto' : 'Logg inn')}
      </Button>

      <p className="tp-login-toggle">
        <span>{isRegistering ? 'Har allerede konto?' : 'Ny her?'}</span>
        <button type="button" className="tp-login-toggle-btn" onClick={toggleMode}>
          {isRegistering ? 'Logg inn' : 'Opprett en konto'}
        </button>
      </p>
    </form>
  )

  if (fullScreen) {
    return (
      <div className="tp-login-shell">
        {/* Ambient radial glows positioned at corners — atmosphere, not decoration */}
        <div className="tp-login-glow tp-login-glow--tl" aria-hidden="true" />
        <div className="tp-login-glow tp-login-glow--br" aria-hidden="true" />

        <main className="tp-login-stage">
          <m.section
            className="tp-login-hero"
            initial="hidden"
            animate="visible"
            variants={stagger}
          >
            <m.div variants={fadeInUp} className="tp-login-brand">
              <span className="tp-login-mark" aria-hidden="true">TP</span>
              <span className="tp-login-brand-text">Training Planner</span>
            </m.div>

            <m.div variants={fadeInUp}>
              <SectionLabel>Bygg form mot målet</SectionLabel>
            </m.div>

            <m.h1 variants={fadeInUp} className="tp-login-headline">
              Bygg uka.<br />
              Vinn <GradientText>løpet</GradientText>
              <span className="tp-login-headline-bar" aria-hidden="true" />
            </m.h1>

            <m.p variants={fadeInUp} className="tp-login-tagline">
              Et profesjonelt verktøy for trenere og utøvere — planlegg økter,
              følg belastning og bygg form mot målet.
            </m.p>

            <m.div variants={fadeInUp} className="tp-login-marks" aria-hidden="true">
              <HeroGraphic />
            </m.div>
          </m.section>

          <m.section
            className="tp-login-card"
            initial={{ opacity: 0, y: 28 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1], delay: 0.15 }}
          >
            <header className="tp-login-card-head">
              <span className="tp-login-eyebrow">
                {isRegistering ? 'Ny bruker' : 'Velkommen tilbake'}
              </span>
              <h2 className="tp-login-card-title">
                {isRegistering ? 'Opprett konto' : 'Logg inn'}
              </h2>
            </header>
            {form}
          </m.section>
        </main>

        <InvertedSection as="footer" className="tp-login-foot">
          <div className="tp-login-foot-inner">
            <span className="tp-login-foot-brand">
              <span className="tp-login-mark tp-login-mark--invert" aria-hidden="true">TP</span>
              Training Planner
            </span>
            <span className="tp-num tp-login-foot-version">v1 · 2026</span>
          </div>
        </InvertedSection>
      </div>
    )
  }

  return (
    <Modal open onClose={onClose} title={isRegistering ? 'Registrer deg' : 'Logg inn'}>
      {form}
    </Modal>
  )
}

/* ── Hero graphic ─────────────────────────────────────────────────
 * Abstract generative composition per design system spec:
 *   • Rotating outer ring (60s, dashed)
 *   • Two floating cards on staggered y-bobbing animations
 *   • 3×3 dot grid
 *   • Solid corner accent block with accent-tinted shadow
 * Hidden on small screens — geometric density only reads at scale. */
function HeroGraphic() {
  return (
    <div className="tp-hero-graphic">
      <m.div
        className="tp-hero-ring"
        animate={{ rotate: 360 }}
        transition={{ duration: 60, repeat: Infinity, ease: 'linear' }}
        aria-hidden="true"
      />
      <m.div
        className="tp-hero-ring tp-hero-ring--inner"
        animate={{ rotate: -360 }}
        transition={{ duration: 90, repeat: Infinity, ease: 'linear' }}
        aria-hidden="true"
      />

      <div className="tp-hero-dots" aria-hidden="true">
        {Array.from({ length: 9 }).map((_, i) => <span key={i} />)}
      </div>

      <m.div className="tp-hero-card tp-hero-card--a" animate={floatY}>
        <span className="tp-hero-card-eyebrow">Mandag · Z3</span>
        <span className="tp-hero-card-num">8 km</span>
        <span className="tp-hero-card-bar"><span style={{ width: '64%' }} /></span>
      </m.div>

      <m.div className="tp-hero-card tp-hero-card--b" animate={floatYAlt}>
        <span className="tp-hero-card-eyebrow">Uke 18</span>
        <span className="tp-hero-card-num">42 km</span>
        <span className="tp-hero-card-meta">+12 % vs forrige</span>
      </m.div>

      <span className="tp-hero-block" aria-hidden="true" />
    </div>
  )
}
