import { useEffect, useState } from 'react'
import { doc, onSnapshot } from 'firebase/firestore'
import { db } from '../firebase'
import { Button } from '../components/ui'
import { buildStravaAuthorizeUrl, disconnectStrava } from './stravaClient'

export default function StravaConnectButton({ athleteId }) {
  const [status, setStatus] = useState('loading')

  useEffect(() => {
    if (!athleteId) return
    return onSnapshot(doc(db, 'stravaConnections', athleteId), snap => {
      setStatus(snap.exists() ? (snap.data().status || 'connected') : 'none')
    }, () => setStatus('none'))
  }, [athleteId])

  async function connect() {
    const url = await buildStravaAuthorizeUrl()
    window.location.href = url
  }

  async function disconnect() {
    await disconnectStrava()
  }

  if (status === 'loading') return <span>…</span>
  if (status === 'connected') {
    return (
      <Button variant="ghost" size="sm" onClick={disconnect}>
        Disconnect Strava
      </Button>
    )
  }
  return (
    <Button
      size="sm"
      onClick={connect}
      style={{ background: '#FC4C02', borderColor: '#FC4C02', color: '#fff' }}
    >
      {status === 'disconnected' ? 'Reconnect Strava' : 'Connect Strava'}
    </Button>
  )
}
