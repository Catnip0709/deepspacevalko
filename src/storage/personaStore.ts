import { personaStorageKey } from '../app/storageKeys'
import type { PersonaSettings } from '../app/types'
import { defaultPersonaSettings } from '../config/aoyinPersona'

const shortFieldLimit = 120
const longFieldLimit = 1200

export function readStoredPersonaSettings(): PersonaSettings {
  try {
    const raw = window.localStorage.getItem(personaStorageKey)
    return raw ? normalizePersonaSettings(JSON.parse(raw)) : cloneDefaultPersonaSettings()
  } catch {
    return cloneDefaultPersonaSettings()
  }
}

export function writeStoredPersonaSettings(settings: PersonaSettings) {
  const normalized = normalizePersonaSettings(settings)

  try {
    window.localStorage.setItem(personaStorageKey, JSON.stringify(normalized))
  } catch {
    // Browser privacy modes can reject writes. Keep runtime usable.
  }

  return normalized
}

export function cloneDefaultPersonaSettings(): PersonaSettings {
  return {
    version: 1,
    aoyin: { ...defaultPersonaSettings.aoyin },
    hunter: { ...defaultPersonaSettings.hunter }
  }
}

export function normalizePersonaSettings(value: unknown): PersonaSettings {
  const root = isRecord(value) ? value : {}
  const aoyin = isRecord(root.aoyin) ? root.aoyin : {}
  const hunter = isRecord(root.hunter) ? root.hunter : {}

  return {
    version: 1,
    aoyin: {
      aliases: readText(aoyin.aliases, defaultPersonaSettings.aoyin.aliases, shortFieldLimit),
      likes: readText(aoyin.likes, defaultPersonaSettings.aoyin.likes, shortFieldLimit),
      personality: readText(aoyin.personality, defaultPersonaSettings.aoyin.personality, longFieldLimit),
      relationshipStyle: readText(
        aoyin.relationshipStyle,
        defaultPersonaSettings.aoyin.relationshipStyle,
        longFieldLimit
      ),
      speakingStyle: readText(aoyin.speakingStyle, defaultPersonaSettings.aoyin.speakingStyle, longFieldLimit),
      customNotes: readText(aoyin.customNotes, '', longFieldLimit)
    },
    hunter: {
      name: readRequiredText(hunter.name, defaultPersonaSettings.hunter.name, shortFieldLimit),
      nicknameFromAoyin: readRequiredText(
        hunter.nicknameFromAoyin,
        defaultPersonaSettings.hunter.nicknameFromAoyin,
        shortFieldLimit
      ),
      identity: readText(hunter.identity, defaultPersonaSettings.hunter.identity, longFieldLimit),
      personality: readText(hunter.personality, defaultPersonaSettings.hunter.personality, longFieldLimit),
      relationship: readText(hunter.relationship, defaultPersonaSettings.hunter.relationship, longFieldLimit),
      customNotes: readText(hunter.customNotes, '', longFieldLimit)
    }
  }
}

function readText(value: unknown, fallback: string, maxLength: number) {
  if (typeof value !== 'string') {
    return fallback
  }

  return value.trim().slice(0, maxLength)
}

function readRequiredText(value: unknown, fallback: string, maxLength: number) {
  return readText(value, fallback, maxLength) || fallback
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}
