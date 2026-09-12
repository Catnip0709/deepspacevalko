import type { Moment } from '../../app/types'

export function formatMomentTime(moment: Moment, now = new Date()) {
  if (!moment.createdAt) return moment.time
  const date = new Date(moment.createdAt)
  const clock = date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', hour12: false })
  if (date.toDateString() === now.toDateString()) return `今天 ${clock}`
  const yesterday = new Date(now)
  yesterday.setDate(yesterday.getDate() - 1)
  if (date.toDateString() === yesterday.toDateString()) return `昨天 ${clock}`
  return `${date.getFullYear()}/${date.getMonth() + 1}/${date.getDate()} ${clock}`
}
