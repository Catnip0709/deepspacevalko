import { Wifi } from 'lucide-react'
import { getCurrentTime } from '../app/time'

export function StatusBar() {
  return (
    <header className="status-bar" aria-label="状态栏">
      <time>{getCurrentTime()}</time>
      <div className="status-icons" aria-hidden="true">
        <Wifi size={15} strokeWidth={2.3} />
        <span className="signal-bars">
          <i />
          <i />
          <i />
        </span>
        <span className="battery">
          <span />
        </span>
      </div>
    </header>
  )
}
