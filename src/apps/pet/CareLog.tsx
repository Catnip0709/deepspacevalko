import type { PetCareLog } from './petTypes'

export function CareLog({ logs, hunterName }: { logs: PetCareLog[]; hunterName: string }) {
  return (
    <div className="pet-log-view">
      <header>
        <p>这几天的小事</p>
        <h2>照料记录</h2>
      </header>

      <div className="pet-log-list">
        {logs.length ? (
          logs.map((log) => (
            <article className={`pet-log-item ${log.actor}`} key={log.id}>
              <div className="pet-log-meta">
                <strong>{log.actor === 'aoyin' ? '敖尹' : log.actor === 'hunter' ? hunterName : '波万'}</strong>
                <time dateTime={new Date(log.createdAt).toISOString()}>{formatLogTime(log.createdAt)}</time>
              </div>
              <p>{log.text}</p>
            </article>
          ))
        ) : (
          <p className="pet-log-empty">小窝今天很安静。</p>
        )}
      </div>
    </div>
  )
}

function formatLogTime(timestamp: number) {
  const date = new Date(timestamp)
  const today = new Date()
  const isToday =
    date.getFullYear() === today.getFullYear() &&
    date.getMonth() === today.getMonth() &&
    date.getDate() === today.getDate()

  return `${isToday ? '今天' : `${date.getMonth() + 1}/${date.getDate()}`} ${date
    .toLocaleTimeString('zh-CN', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    })
    .replace(/^24:/, '00:')}`
}
