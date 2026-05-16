import { Component } from 'react'

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { error: null }
  }

  static getDerivedStateFromError(error) {
    return { error }
  }

  componentDidCatch(error, info) {
    console.error('Uventet feil i applikasjonen', error, info)
  }

  handleReload = () => {
    if (typeof window !== 'undefined') window.location.reload()
  }

  render() {
    if (!this.state.error) return this.props.children
    return (
      <div role="alert" style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '1rem',
        padding: '2rem',
        textAlign: 'center',
        fontFamily: 'Inter Tight, system-ui, sans-serif',
      }}>
        <h1 style={{ fontSize: '1.5rem', margin: 0 }}>Noe gikk galt</h1>
        <p style={{ maxWidth: '34rem', color: '#555' }}>
          Appen møtte en uventet feil. Last siden på nytt for å fortsette.
        </p>
        <button
          type="button"
          onClick={this.handleReload}
          style={{
            padding: '0.65rem 1.25rem',
            borderRadius: '8px',
            border: '1px solid #222',
            background: '#222',
            color: '#fff',
            cursor: 'pointer',
            fontSize: '1rem',
          }}
        >
          Last på nytt
        </button>
      </div>
    )
  }
}
