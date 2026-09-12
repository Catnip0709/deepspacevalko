import { calendarStorageKey } from '../app/storageKeys'
import { anniversaryNameLimit, isCalendarDate, type Anniversary } from '../apps/calendar/calendarDates'

export function readStoredAnniversaries(): { entries: Anniversary[]; error: string } {
  try {
    const raw = window.localStorage.getItem(calendarStorageKey)
    if (raw === null) return { entries: [{ date: '2026-06-22', name: '初见' }], error: '' }
    const data: unknown = JSON.parse(raw)
    if (!isRecord(data) || data.version !== 1 || !Array.isArray(data.entries)) throw new Error('Invalid calendar')
    const dates = new Map<string, Anniversary>()
    let invalid = false
    for (const entry of data.entries) {
      if (!isRecord(entry) || !isCalendarDate(entry.date) || typeof entry.name !== 'string' || !entry.name.trim()) {
        invalid = true
        continue
      }
      dates.set(entry.date, {
        date: entry.date,
        name: entry.name.trim().slice(0, anniversaryNameLimit),
        ...(typeof entry.aoyinNote === 'string' && entry.aoyinNote.trim()
          ? { aoyinNote: entry.aoyinNote.trim().slice(0, 200) } : {})
      })
    }
    return {
      entries: [...dates.values()],
      error: invalid ? '部分纪念日未能读取，原存档暂未更改。' : ''
    }
  } catch {
    return { entries: [], error: '纪念日未能读取，请检查浏览器存储后重试。' }
  }
}

export function writeStoredAnniversaries(entries: Anniversary[]): boolean {
  try {
    window.localStorage.setItem(calendarStorageKey, JSON.stringify({ version: 1, entries }))
    return true
  } catch {
    return false
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}
