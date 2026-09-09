import { petStorageKey } from '../app/storageKeys'
import { createInitialPetState, settlePetState } from '../apps/pet/petEngine'
import type { PetCareLog, PetState } from '../apps/pet/petTypes'

export function readStoredPetState(): PetState {
  const now = Date.now()

  try {
    const raw = window.localStorage.getItem(petStorageKey)
    if (!raw) {
      return createInitialPetState(now)
    }

    return settlePetState(normalizePetState(JSON.parse(raw), now), now)
  } catch {
    return createInitialPetState(now)
  }
}

export function writeStoredPetState(state: PetState) {
  try {
    window.localStorage.setItem(petStorageKey, JSON.stringify(state))
  } catch {
    // Keep the pet usable when browser storage is unavailable.
  }
}

function normalizePetState(value: unknown, now: number): PetState {
  if (!isRecord(value)) {
    return createInitialPetState(now)
  }

  return {
    version: 1,
    hunger: readStat(value.hunger, 78),
    mood: readStat(value.mood, 82),
    energy: readStat(value.energy, 74),
    affection: readStat(value.affection, 12),
    isSleeping: typeof value.isSleeping === 'boolean' ? value.isSleeping : false,
    reaction:
      typeof value.reaction === 'string' && value.reaction.trim()
        ? value.reaction.slice(0, 180)
        : '波万抬起头看了看你。',
    lastUpdatedAt: readTimestamp(value.lastUpdatedAt, now),
    lastAoyinCareAt: readTimestamp(value.lastAoyinCareAt, now),
    lastPetAt: readTimestamp(value.lastPetAt, 0),
    logs: Array.isArray(value.logs)
      ? value.logs.map(normalizeLog).filter((log): log is PetCareLog => Boolean(log)).slice(0, 24)
      : []
  }
}

function normalizeLog(value: unknown): PetCareLog | null {
  if (!isRecord(value) || typeof value.text !== 'string') {
    return null
  }

  const actor = value.actor === 'aoyin' || value.actor === 'hunter' || value.actor === 'bowan' ? value.actor : 'bowan'
  const createdAt = readTimestamp(value.createdAt, Date.now())

  return {
    id: typeof value.id === 'string' ? value.id.slice(0, 120) : `pet-log-${createdAt}-${actor}`,
    actor,
    text: value.text.slice(0, 180),
    createdAt
  }
}

function readStat(value: unknown, fallback: number) {
  return typeof value === 'number' && Number.isFinite(value)
    ? Math.max(0, Math.min(100, Math.round(value)))
    : fallback
}

function readTimestamp(value: unknown, fallback: number) {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 ? value : fallback
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}
