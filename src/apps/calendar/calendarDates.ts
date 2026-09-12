export type Anniversary = { date: string; name: string; aoyinNote?: string }

export const firstCalendarDate = '2026-01-01'
export const firstCalendarMonth = '2026-01'
export const anniversaryNameLimit = 60

export function localDateKey(date = new Date()): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

export function isCalendarDate(value: unknown): value is string {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value) || value < firstCalendarDate) return false
  const [year, month, day] = value.split('-').map(Number)
  const date = new Date(Date.UTC(year, month - 1, day))
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day
}

export function isCalendarMonth(value: string) {
  return /^\d{4}-\d{2}$/.test(value) && isCalendarDate(`${value}-01`)
}

export function shiftMonth(month: string, amount: number): string {
  const [year, monthNumber] = month.split('-').map(Number)
  const date = new Date(Date.UTC(year, monthNumber - 1 + amount, 1))
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`
}

export function monthCells(month: string): (string | null)[] {
  const [year, monthNumber] = month.split('-').map(Number)
  const first = new Date(Date.UTC(year, monthNumber - 1, 1))
  const offset = (first.getUTCDay() + 6) % 7
  const length = new Date(Date.UTC(year, monthNumber, 0)).getUTCDate()
  return Array.from({ length: 42 }, (_, index) => {
    const day = index - offset + 1
    return day > 0 && day <= length ? `${month}-${String(day).padStart(2, '0')}` : null
  })
}

export function daysSince(date: string, today: string): number {
  // Convert civil dates to UTC day numbers, rather than elapsed local hours.
  const dayNumber = (key: string) => {
    const [year, month, day] = key.split('-').map(Number)
    return Date.UTC(year, month - 1, day) / 86400000
  }
  return dayNumber(today) - dayNumber(date)
}

export function dateLabel(key: string): string {
  const [year, month, day] = key.split('-').map(Number)
  return `${year}年${month}月${day}日`
}
