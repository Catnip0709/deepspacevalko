import { useEffect, useRef, useState } from 'react'
import type { DeepSeekModel, PersonaSettings } from '../../app/types'
import { requestAnniversaryNote } from '../../harness/anniversaryNoteHarness'
import { readStoredAnniversaries, writeStoredAnniversaries } from '../../storage/calendarStore'
import type { Anniversary } from './calendarDates'

export function useCalendarEntries({
  apiKey, model, persona
}: { apiKey: string; model: DeepSeekModel; persona: PersonaSettings }) {
  const [stored] = useState(readStoredAnniversaries)
  const [entries, setEntries] = useState(stored.entries)
  const entriesRef = useRef(entries)
  const [error, setError] = useState(stored.error)
  const [noteStates, setNoteStates] = useState<Record<string, string>>({})
  const requests = useRef(new Map<string, AbortController>())

  useEffect(() => {
    if (!stored.error && !writeStoredAnniversaries(stored.entries)) {
      setError('纪念日未能保存，请检查浏览器存储空间。')
    }
    const active = requests.current
    return () => {
      active.forEach((controller) => controller.abort())
      active.clear()
    }
  }, [stored])

  const commit = (next: Anniversary[]) => {
    if (!writeStoredAnniversaries(next)) {
      setError('纪念日未能保存，请检查浏览器存储空间后再试。')
      return false
    }
    entriesRef.current = next
    setEntries(next)
    setError('')
    return true
  }
  const setNoteState = (date: string, state: string) =>
    setNoteStates((current) => ({ ...current, [date]: state }))
  const cancelNote = (date: string) => {
    requests.current.get(date)?.abort()
    requests.current.delete(date)
    setNoteState(date, '')
  }

  const generateNote = async (date: string) => {
    const entry = entriesRef.current.find((item) => item.date === date)
    if (!entry || entry.aoyinNote || requests.current.has(date)) return
    if (!apiKey.trim()) {
      setNoteState(date, '填写 API Key 后，敖尹才能留言。')
      return
    }
    const controller = new AbortController()
    requests.current.set(date, controller)
    setNoteState(date, 'pending')
    const timeout = window.setTimeout(() => controller.abort(), 60000)
    try {
      const note = await requestAnniversaryNote({ entry, apiKey, model, persona, signal: controller.signal })
      // A deleted/renamed/recreated event must never receive an old request's result.
      if (requests.current.get(date) !== controller || controller.signal.aborted) return
      const current = entriesRef.current.find((item) => item.date === date)
      if (!current || current.name !== entry.name) return
      const saved = commit(entriesRef.current.map((item) => item.date === date ? { ...item, aoyinNote: note } : item))
      setNoteState(date, saved ? '' : '留言未能保存，请再试一次。')
    } catch {
      if (requests.current.get(date) === controller) {
        setNoteState(date, controller.signal.aborted ? '留言等得有些久了，请再试一次。' : '留言未能生成，请检查网络和 API Key 后再试。')
      }
    } finally {
      window.clearTimeout(timeout)
      if (requests.current.get(date) === controller) {
        requests.current.delete(date)
        setNoteStates((current) => current[date] === 'pending' ? { ...current, [date]: '' } : current)
      }
    }
  }

  const saveEntry = (date: string, name: string) => {
    const previous = entriesRef.current.find((entry) => entry.date === date)
    const next = previous?.name === name ? previous : { date, name }
    if (!commit([...entriesRef.current.filter((entry) => entry.date !== date), next])) return false
    if (previous?.name !== name) cancelNote(date)
    if (!previous) void generateNote(date)
    return true
  }
  const deleteEntry = (date: string) => {
    if (!commit(entriesRef.current.filter((entry) => entry.date !== date))) return false
    cancelNote(date)
    return true
  }
  return { entries, error, noteStates, saveEntry, deleteEntry, generateNote }
}
