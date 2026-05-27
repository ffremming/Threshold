import { Button } from '../components/ui'

export default function ProfileErrorScreen({ message, onLogout }) {
  return (
    <div className="ah-status">
      <div className="ah-status-card">
        <span className="th-shell-mark" aria-hidden="true">TH</span>
        <h2 className="ah-status-title">Threshold</h2>
        <p className="ah-status-text">{message}</p>
        <Button variant="secondary" onClick={onLogout}>Sign out</Button>
      </div>
    </div>
  )
}
