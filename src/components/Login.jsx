import { useState } from 'react'
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth'
import { auth } from '../firebase'
import { createUserProfile } from '../userService'
import { Button, Field, Input, Modal } from './ui'
import './Login.css'

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

      <Button type="submit" size="lg" block disabled={loading}>
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
        <main className="tp-login-stage">
          <section className="tp-login-hero">
            <div className="tp-login-brand">
              <span className="tp-login-mark" aria-hidden="true">TP</span>
              <span className="tp-login-brand-text">Training Planner</span>
            </div>

            <h1 className="tp-login-headline">
              Bygg uka. Vinn løpet.
            </h1>
            <p className="tp-login-tagline">
              Et profesjonelt verktøy for trenere og utøvere — planlegg økter, følg belastning og bygg form mot målet.
            </p>
          </section>

          <section className="tp-login-card">
            <header className="tp-login-card-head">
              <span className="tp-login-eyebrow">{isRegistering ? 'Ny bruker' : 'Velkommen tilbake'}</span>
              <h2 className="tp-login-card-title">{isRegistering ? 'Opprett konto' : 'Logg inn'}</h2>
            </header>
            {form}
          </section>
        </main>

        <footer className="tp-login-foot">
          <span>© Training Planner</span>
          <span className="tp-num">v1</span>
        </footer>
      </div>
    )
  }

  return (
    <Modal open onClose={onClose} title={isRegistering ? 'Registrer deg' : 'Logg inn'}>
      {form}
    </Modal>
  )
}
