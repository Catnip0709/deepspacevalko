export function localWeiboDate(date = new Date()) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function formatWeiboDate(value: string) {
  const [year, month, day] = value.split('-').map(Number)
  return `${year}年${month}月${day}日`
}

export function formatPostTime(timestamp: number) {
  const date = new Date(timestamp)
  const today = localWeiboDate()
  const dateKey = localWeiboDate(date)
  const time = date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', hour12: false })
  return dateKey === today ? `今天 ${time}` : `${date.getMonth() + 1}月${date.getDate()}日 ${time}`
}
