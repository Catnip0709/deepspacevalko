import { chatStorageKey } from '../app/storageKeys'
import type { ChatMessage } from '../app/types'
import { initialChatMessages } from '../apps/wechat/chatData'

export function readStoredChatMessages() {
  try {
    const raw = window.localStorage.getItem(chatStorageKey)
    return raw ? normalizeStoredMessages(JSON.parse(raw)) : initialChatMessages
  } catch {
    return initialChatMessages
  }
}

export function writeStoredChatMessages(messages: ChatMessage[]) {
  try {
    window.localStorage.setItem(chatStorageKey, JSON.stringify(messages.filter(isPersistableMessage)))
  } catch {
    // Ignore write failures so restricted browsers do not crash the app.
  }
}

function normalizeStoredMessages(messages: unknown) {
  if (!Array.isArray(messages)) {
    return initialChatMessages
  }

  return messages
    .filter(isStoredChatMessage)
    .filter((message) => message.id !== 'welcome-aoyin' && isPersistableMessage(message))
    .map((message) => ({
      ...message,
      type: message.type ?? 'text'
    }))
}

function isPersistableMessage(message: ChatMessage) {
  return message.role !== 'assistant' || Boolean(message.content.trim())
}

function isStoredChatMessage(value: unknown): value is ChatMessage {
  if (typeof value !== 'object' || value === null) return false
  const message = value as Partial<ChatMessage>
  return (
    typeof message.id === 'string' &&
    (message.role === 'user' || message.role === 'assistant') &&
    typeof message.content === 'string' &&
    typeof message.createdAt === 'string'
  )
}
