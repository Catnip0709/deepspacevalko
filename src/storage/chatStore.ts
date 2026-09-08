import { chatStorageKey } from '../app/storageKeys'
import type { ChatMessage } from '../app/types'
import { initialChatMessages } from '../apps/wechat/chatData'

export function readStoredChatMessages() {
  try {
    const raw = window.localStorage.getItem(chatStorageKey)
    return raw ? normalizeStoredMessages(JSON.parse(raw) as ChatMessage[]) : initialChatMessages
  } catch {
    return initialChatMessages
  }
}

export function writeStoredChatMessages(messages: ChatMessage[]) {
  try {
    window.localStorage.setItem(chatStorageKey, JSON.stringify(messages))
  } catch {
    // Ignore write failures so restricted browsers do not crash the app.
  }
}

function normalizeStoredMessages(messages: ChatMessage[]) {
  if (!Array.isArray(messages)) {
    return initialChatMessages
  }

  return messages
    .filter((message) => message.id !== 'welcome-aoyin')
    .map((message) => ({
      ...message,
      type: message.type ?? 'text'
    }))
}
